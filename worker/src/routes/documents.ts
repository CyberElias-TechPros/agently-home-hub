import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext, AppEnv } from '../http/context';
import { currentAuth, requireParam } from '../http/context';
import { created, ok, noContent } from '../http/responses';
import { validate, parseJsonBody } from '../http/validate';
import { withRateLimit } from '../http/middleware';
import { ApiError } from '../lib/errors';
import { execute, nowIso, queryAll, queryOne } from '../repositories/db';
import { recordAudit } from '../services/notifications';

/**
 * Document storage on R2.
 *
 * The browser uploads straight to a short-lived signed URL so a 10 MB PDF never
 * transits the Worker. The Worker only decides *whether* the upload may happen
 * and records the metadata.
 */

const DOCUMENT_CATEGORIES = [
  'lease',
  'identity',
  'proof_of_income',
  'insurance',
  'inspection',
  'receipt',
  'other',
] as const;

/** Types we accept. Executables, archives and SVGs (XSS vector) are excluded. */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

const uploadIntentSchema = z.object({
  name: z.string().trim().min(1, 'Name the document.').max(200),
  category: z.enum(DOCUMENT_CATEGORIES).default('other'),
  mime_type: z.string().min(3).max(150),
  size_bytes: z.number().int().positive('That file looks empty.').max(100 * 1024 * 1024),
  property_id: z.string().uuid().optional(),
});

const DOWNLOAD_URL_TTL_SECONDS = 300;

export const documentRoutes = new Hono<AppEnv>();

documentRoutes.get('/', async (c: AppContext) => {
  const auth = currentAuth(c);
  const rows = await queryAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT id, owner_id, property_id, name, category, mime_type, size_bytes, storage_key, uploaded_at, created_at, updated_at
       FROM documents
      WHERE owner_id = ?
      ORDER BY created_at DESC
      LIMIT 200`,
    [auth.userId]
  );
  return ok({ data: rows });
});

/**
 * Step 1 of the upload: validate the intent and return a signed PUT URL.
 * The row is created in a `pending` state (uploaded_at IS NULL) so abandoned
 * intents can be garbage-collected by the nightly cron.
 */
documentRoutes.post('/upload-intent', withRateLimit('upload:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const config = c.get('config');
  const body = validate(uploadIntentSchema, await parseJsonBody(c.req.raw));

  if (!ALLOWED_MIME_TYPES.has(body.mime_type)) {
    throw ApiError.validation('That file type is not supported.', {
      mime_type: ['Upload a PDF, image, spreadsheet or text file.'],
    });
  }
  if (body.size_bytes > config.maxUploadBytes) {
    throw ApiError.payloadTooLarge(
      `Files are limited to ${Math.round(config.maxUploadBytes / (1024 * 1024))} MB.`
    );
  }

  if (body.property_id) {
    const owns = await queryOne<{ id: string }>(
      c.env.DB,
      `SELECT id FROM properties WHERE id = ? AND landlord_id = ?`,
      [body.property_id, auth.userId]
    );
    const rents = await queryOne<{ id: string }>(
      c.env.DB,
      `SELECT id FROM bookings WHERE property_id = ? AND tenant_id = ? AND status = 'approved'`,
      [body.property_id, auth.userId]
    );
    if (!owns && !rents) {
      throw ApiError.forbidden('You can only attach documents to a property you own or rent.');
    }
  }

  const id = crypto.randomUUID();
  // Key layout is owner-scoped and unguessable, so keys cannot be enumerated.
  const extension = EXTENSION_BY_MIME[body.mime_type] ?? 'bin';
  const storageKey = `users/${auth.userId}/${id}.${extension}`;

  const uploadUrl = await signUploadUrl(c, storageKey, body.mime_type, body.size_bytes);

  await execute(
    c.env.DB,
    `INSERT INTO documents (id, owner_id, property_id, name, category, mime_type, size_bytes, storage_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      auth.userId,
      body.property_id ?? null,
      body.name,
      body.category,
      body.mime_type,
      body.size_bytes,
      storageKey,
      nowIso(),
      nowIso(),
    ]
  );

  const document = await queryOne<Record<string, unknown>>(
    c.env.DB,
    `SELECT * FROM documents WHERE id = ?`,
    [id]
  );

  return created({
    data: {
      document,
      upload_url: uploadUrl.url,
      method: 'PUT',
      required_headers: uploadUrl.requiredHeaders,
      expires_at: uploadUrl.expiresAt,
    },
  });
});

/** Step 2: the browser confirms the bytes landed in R2. */
documentRoutes.post('/:id/complete', async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');

  const document = await ownedDocument(c, id, auth.userId);
  const object = await c.env.DOCUMENTS.head(document.storage_key as string);
  if (!object) {
    throw ApiError.conflict('We could not find the uploaded file. Please try again.');
  }

  await execute(c.env.DB, `UPDATE documents SET uploaded_at = ?, size_bytes = ?, updated_at = ? WHERE id = ?`, [
    nowIso(),
    object.size,
    nowIso(),
    id,
  ]);

  return ok({ data: { id, uploaded_at: nowIso(), size_bytes: object.size } });
});

/** Time-limited download URL. Ownership is checked before signing. */
documentRoutes.get('/:id/download', async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const document = await ownedDocument(c, id, auth.userId, { allowLandlord: true });

  const object = await c.env.DOCUMENTS.head(document.storage_key as string);
  if (!object) throw ApiError.notFound('That file');

  const url = await signDownloadUrl(c, document.storage_key as string, (document.name as string) ?? 'document');
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'document.downloaded',
    resourceType: 'document',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });

  return ok({ data: { url: url.url, expires_at: url.expiresAt } });
});

documentRoutes.delete('/:id', withRateLimit('write:default'), async (c: AppContext) => {
  const auth = currentAuth(c);
  const id = requireParam(c, 'id');
  const document = await ownedDocument(c, id, auth.userId);

  await c.env.DOCUMENTS.delete(document.storage_key as string);
  await execute(c.env.DB, `DELETE FROM documents WHERE id = ?`, [id]);
  await recordAudit(c.env, {
    actorId: auth.userId,
    action: 'document.deleted',
    resourceType: 'document',
    resourceId: id,
    ip: c.req.header('cf-connecting-ip'),
  });

  return noContent();
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

interface OwnedDocument {
  id: string;
  owner_id: string;
  property_id: string | null;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
}

async function ownedDocument(
  c: AppContext,
  id: string,
  userId: string,
  options: { allowLandlord?: boolean } = {}
): Promise<OwnedDocument> {
  const document = await queryOne<OwnedDocument>(c.env.DB, `SELECT * FROM documents WHERE id = ?`, [id]);
  if (!document) throw ApiError.notFound('That document');

  if (document.owner_id === userId) return document;

  // A landlord may open documents attached to a property they own (for example
  // a tenant's proof of income) — but only those, never unrelated documents.
  if (options.allowLandlord && document.property_id) {
    const owns = await queryOne<{ id: string }>(
      c.env.DB,
      `SELECT id FROM properties WHERE id = ? AND landlord_id = ?`,
      [document.property_id, userId]
    );
    if (owns) return document;
  }

  throw ApiError.notFound('That document');
}

/**
 * Presigned URL creation.
 *
 * Cloudflare R2 supports native presigned URLs via the AWS S4 protocol. Signing
 * requires an Access Key + Secret, which are supplied as Worker secrets. When
 * they are absent (local dev, or a project that has not enabled them) we fall
 * back to a Worker-proxied upload path so the feature still works end to end.
 */
async function signUploadUrl(
  c: AppContext,
  key: string,
  contentType: string,
  sizeBytes: number
): Promise<{ url: string; requiredHeaders: Record<string, string>; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const accountId = (c.env as unknown as { R2_ACCOUNT_ID?: string }).R2_ACCOUNT_ID;
  const accessKeyId = (c.env as unknown as { R2_ACCESS_KEY_ID?: string }).R2_ACCESS_KEY_ID;
  const secretAccessKey = (c.env as unknown as { R2_SECRET_ACCESS_KEY?: string }).R2_SECRET_ACCESS_KEY;
  const bucket = (c.env as unknown as { R2_BUCKET_NAME?: string }).R2_BUCKET_NAME;

  if (accountId && accessKeyId && secretAccessKey && bucket) {
    const url = await presignS3({
      method: 'PUT',
      accountId,
      bucket,
      key,
      accessKeyId,
      secretAccessKey,
      expiresInSeconds: 900,
      contentType,
      contentLength: sizeBytes,
    });
    return {
      url,
      requiredHeaders: { 'Content-Type': contentType },
      expiresAt,
    };
  }

  // Fallback: stream through the Worker with a short-lived capability token.
  const token = await signCapability(c, key, 'put');
  const url = new URL(`/documents/upload/${encodeURIComponent(key)}?token=${token}`, new URL(c.req.url).origin);
  return { url: url.toString(), requiredHeaders: { 'Content-Type': contentType }, expiresAt };
}

async function signDownloadUrl(
  c: AppContext,
  key: string,
  filename: string
): Promise<{ url: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString();
  const token = await signCapability(c, key, 'get');
  const url = new URL(
    `/documents/file/${encodeURIComponent(key)}?token=${token}&filename=${encodeURIComponent(filename)}`,
    new URL(c.req.url).origin
  );
  return { url: url.toString(), expiresAt };
}

/**
 * HMAC capability token bound to a single key and verb.
 *
 * This is what makes the Worker-proxied fallback safe: a token for `get` on one
 * key cannot be replayed to upload, or to read a different document.
 */
async function signCapability(c: AppContext, key: string, verb: 'get' | 'put'): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + (verb === 'put' ? 900 : DOWNLOAD_URL_TTL_SECONDS);
  const payload = `${verb}:${key}:${expires}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(c.env.JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', keyMaterial, new TextEncoder().encode(payload));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${expires}.${encoded}`;
}

export async function verifyCapability(
  secret: string,
  token: string,
  key: string,
  verb: 'get' | 'put'
): Promise<boolean> {
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) return false;
  if (Number(expiry) < Math.floor(Date.now() / 1000)) return false;

  const payload = `${verb}:${key}:${expiry}`;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expected = await crypto.subtle.sign('HMAC', keyMaterial, new TextEncoder().encode(payload));
  const encoded = btoa(String.fromCharCode(...new Uint8Array(expected)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return encoded === signature;
}

/** AWS Signature V4 presigner for R2 (used when credentials are configured). */
async function presignS3(args: {
  method: 'PUT' | 'GET';
  accountId: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresInSeconds: number;
  contentType?: string;
  contentLength?: number;
}): Promise<string> {
  const host = `${args.accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${args.bucket}/${args.key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;

  const now = new Date();
  const amzDate = `${now.toISOString().replace(/[:-]|\.\d{3}/g, '')}`;
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const credential = `${args.accessKeyId}/${scope}`;

  const params = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(args.expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    args.method,
    `/${args.bucket}/${args.key.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`,
    params.toString(),
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const encoder = new TextEncoder();
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest)))),
  ].join('\n');

  const signingKey = await deriveSigningKey(args.secretAccessKey, dateStamp);
  const signature = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, encoder.encode(stringToSign))));

  return `${endpoint}?${params.toString()}&X-Amz-Signature=${signature}`;
}

async function deriveSigningKey(secret: string, dateStamp: string): Promise<CryptoKey> {
  const kSecret = new TextEncoder().encode(`AWS4${secret}`);
  const kDate = await hmacChain(kSecret, dateStamp);
  const kRegion = await hmacChain(kDate, 'auto');
  const kService = await hmacChain(kRegion, 's3');
  const kSigning = await hmacChain(kService, 'aws4_request');
  return crypto.subtle.importKey('raw', kSigning, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

/** One link of the AWS Signature V4 key derivation chain. */
async function hmacChain(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
