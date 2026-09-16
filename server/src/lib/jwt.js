// Tiny, secure JWT implementation (HMAC-SHA256) that works identically on
// Node.js and Cloudflare Workers — both expose the WebCrypto API.
//
// Token format: base64url(header).base64url(payload).base64url(signature)
// Payload carries { sub, email, role, type, iat, exp }.

const enc = new TextEncoder();

function b64url(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sign(input, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(input));
  return new Uint8Array(sig);
}

function parseTtl(ttl, fallbackSeconds) {
  // Supports Cloudflare-style durations: "30s", "15m", "1h", "7d"
  if (typeof ttl === 'number') return ttl;
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(String(ttl).trim());
  if (!match) return fallbackSeconds;
  const n = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit] || 1;
  return n * mult;
}

export async function signToken(payload, secret, ttl, type = 'access') {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = parseTtl(ttl, 3600);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, type, iat: now, exp: now + ttlSeconds };
  const h = b64url(enc.encode(JSON.stringify(header)));
  const p = b64url(enc.encode(JSON.stringify(body)));
  const sig = b64url(await sign(`${h}.${p}`, secret));
  return `${h}.${p}.${sig}`;
}

export async function verifyToken(token, secret, expectedType) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;

  const expectedSig = b64url(await sign(`${h}.${p}`, secret));
  if (expectedSig !== sig) return null;

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
  } catch {
    return null;
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (expectedType && payload.type !== expectedType) return null;
  return payload;
}

export async function signAccessToken(user, config) {
  return signToken(
    { sub: String(user.id), email: user.email, role: user.role, name: user.name },
    config.jwtSecret,
    config.jwtAccessTtl,
    'access'
  );
}

export async function signRefreshToken(user, config) {
  return signToken(
    { sub: String(user.id) },
    config.jwtRefreshSecret,
    `${config.jwtRefreshTtlDays}d`,
    'refresh'
  );
}

export function publicUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || null,
    avatar: user.avatar_url || null,
    verified: !!user.verified,
    createdAt: user.created_at,
  };
}
