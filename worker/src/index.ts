import { Hono } from 'hono';
import type { AppEnv, AppContext } from './http/context';
import { authenticate, optionalAuth, requireAuth, requireAnyRole } from './http/context';
import { withRequestContext, noStore } from './http/middleware';
import { json } from './http/responses';
import { loadConfig, type Env as WorkerEnv, type NotificationJob } from './env';
import { ApiError, toApiError } from './lib/errors';
import { logger } from './lib/logger';
import { authRoutes } from './routes/auth';
import { propertyRoutes } from './routes/properties';
import { bookingRoutes } from './routes/bookings';
import { maintenanceRoutes } from './routes/maintenance';
import { conversationRoutes } from './routes/conversations';
import { documentRoutes, verifyCapability } from './routes/documents';
import { leadRoutes } from './routes/leads';
import { vendorRoutes } from './routes/vendors';
import { roommateRoutes } from './routes/roommates';
import { notificationRoutes } from './routes/notifications';
import { adminRoutes } from './routes/admin';
import { profileRoutes } from './routes/profile';
import { handleNotificationQueue } from './queues/notifications';
import { runScheduled } from './cron';
import { RealtimeHub } from './durable/RealtimeHub';

export { RealtimeHub };

const app = new Hono<AppEnv>();

/**
 * Every JSON route lives under `/api`.
 *
 * The browser calls `/api/...` on its own origin; Vercel rewrites that to this
 * Worker with the prefix intact. Mounting the routes at the root (as they once
 * were) meant the deployed frontend hit 404 on every request while local tests
 * against bare paths passed — the kind of bug that only appears in production.
 */
const api = new Hono<AppEnv>();

/* ------------------------------------------------------------------ */
/* Global middleware                                                   */
/* ------------------------------------------------------------------ */

app.use('*', async (c: AppContext, next) => {
  c.set('config', loadConfig(c.env));
  const startedAt = Date.now();
  try {
    await withRequestContext(c, next);
  } finally {
    logger.info('http.request', {
      request_id: c.get('requestId'),
      method: c.req.method,
      route: new URL(c.req.url).pathname,
      status: c.res.status,
      duration_ms: Date.now() - startedAt,
      user_id: c.get('auth')?.userId,
    });
  }
});

app.use('*', noStore);

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

app.get('/health', (c: AppContext) => {
  const config = c.get('config');
  return json({
    status: 'ok',
    version: config.apiVersion,
    environment: config.environment,
    // Deliberately cheap: a health check must not touch the database or any
    // third party, otherwise a dependency outage hides the fact that the Worker
    // itself is healthy and able to serve an error page.
    time: new Date().toISOString(),
  });
});

app.get('/health/ready', async (c: AppContext) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return json({ status: 'ready', database: 'ok' });
  } catch (error) {
    logger.error('health.ready_failed', { error: error instanceof Error ? error.message : String(error) });
    return json({ status: 'unavailable', database: 'unreachable' }, 503);
  }
});

api.get('/health', (c: AppContext) => {
  const config = c.get('config');
  return json({
    status: 'ok',
    version: config.apiVersion,
    environment: config.environment,
    time: new Date().toISOString(),
  });
});

// The auth subtree is mostly anonymous (register, login, password reset), but
// `/auth/me` needs the caller resolved when a token is present. `optionalAuth`
// does that without turning the public endpoints into 401s.
api.use('/auth/*', optionalAuth);
api.route('/auth', authRoutes);

/* ------------------------------------------------------------------ */
/* Authenticated                                                       */
/* ------------------------------------------------------------------ */

// Property browsing is public. `optionalAuth` resolves a caller when a valid
// token is present (so a landlord sees their own drafts) but never rejects
// anonymous traffic — search and listing pages are the SEO surface.
api.use('/properties/*', optionalAuth);
api.route('/properties', propertyRoutes);

api.use('/profile/*', authenticate, requireAuth());
api.route('/profile', profileRoutes);

api.use('/bookings/*', authenticate, requireAuth());
api.route('/bookings', bookingRoutes);

api.use('/maintenance/*', authenticate, requireAuth());
api.route('/maintenance', maintenanceRoutes);

api.use('/conversations/*', authenticate, requireAuth());
api.route('/conversations', conversationRoutes);

api.use('/documents/*', authenticate, requireAuth());
api.route('/documents', documentRoutes);
api.route('/documents', documentFileRoutes());

api.use('/leads/*', authenticate, requireAnyRole('agent', 'manager', 'admin'));
api.route('/leads', leadRoutes);

api.use('/vendors/*', authenticate, requireAuth());
api.route('/vendors', vendorRoutes);

api.use('/roommates/*', authenticate, requireAuth());
api.route('/roommates', roommateRoutes);

api.use('/notifications/*', authenticate, requireAuth());
api.route('/notifications', notificationRoutes);

// Admin routes additionally require the admin role; every one of them is
// audited.
api.use('/admin/*', authenticate, requireAuth());
api.route('/admin', adminRoutes);

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

/**
 * WebSocket endpoint for messaging.
 *
 * The conversation is verified *before* upgrading, so a user cannot subscribe
 * to a conversation they are not part of by guessing an id.
 */
app.route('/api', api);

app.get('/realtime', async (c: AppContext) => {
  const config = c.get('config');
  const upgrade = c.req.header('Upgrade');
  if (upgrade?.toLowerCase() !== 'websocket') {
    throw ApiError.badRequest('This endpoint speaks WebSocket.');
  }

  const conversationId = new URL(c.req.url).searchParams.get('conversation_id');
  if (!conversationId) throw ApiError.badRequest('conversation_id is required.');

  const token = new URL(c.req.url).searchParams.get('token');
  if (!token) throw ApiError.unauthorized('A sign-in token is required.');

  const { verifyAccessToken } = await import('./lib/jwt');
  const result = await verifyAccessToken(token, c.env.JWT_SECRET, {
    issuer: config.issuer,
    audience: config.audience,
  });
  if (!result.ok) throw ApiError.unauthorized('That sign-in token is not valid.');

  const membership = await c.env.DB.prepare(
    `SELECT id FROM conversations WHERE id = ? AND (participant_one_id = ? OR participant_two_id = ?)`
  )
    .bind(conversationId, result.claims.sub, result.claims.sub)
    .first();

  if (!membership) throw ApiError.notFound('That conversation');

  const hub = c.env.REALTIME_HUB.get(c.env.REALTIME_HUB.idFromName(conversationId));
  return hub.fetch(
    `https://realtime/?conversation_id=${encodeURIComponent(conversationId)}&user_id=${encodeURIComponent(result.claims.sub)}`,
    { headers: { Upgrade: 'websocket' } }
  );
});

/* ------------------------------------------------------------------ */
/* R2 object proxy (fallback when presigned URLs are not configured)   */
/* ------------------------------------------------------------------ */

/** Path parameters in wildcard routes are optional by typing, never in practice. */
function requiredPathParam(c: AppContext, name: string): string {
  const value = c.req.param(name);
  if (!value) throw ApiError.badRequest('Malformed document URL.');
  return value;
}

function documentFileRoutes(): Hono<AppEnv> {
  const router = new Hono<AppEnv>();

  router.put('/upload/:key{.*}', async (c: AppContext) => {
    const auth = c.get('auth');
    if (!auth) throw ApiError.unauthorized();

    const key = decodeURIComponent(requiredPathParam(c, 'key'));
    const token = new URL(c.req.url).searchParams.get('token') ?? '';
    if (!(await verifyCapability(c.env.JWT_SECRET, token, key, 'put'))) {
      throw ApiError.forbidden('That upload link is invalid or has expired.');
    }
    if (!key.startsWith(`users/${auth.userId}/`)) {
      throw ApiError.forbidden('You can only upload into your own folder.');
    }

    const body = await c.req.arrayBuffer();
    await c.env.DOCUMENTS.put(key, body, {
      httpMetadata: { contentType: c.req.header('Content-Type') ?? 'application/octet-stream' },
    });
    return json({ success: true, size: body.byteLength });
  });

  router.get('/file/:key{.*}', async (c: AppContext) => {
    const key = decodeURIComponent(requiredPathParam(c, 'key'));
    const token = new URL(c.req.url).searchParams.get('token') ?? '';
    if (!(await verifyCapability(c.env.JWT_SECRET, token, key, 'get'))) {
      throw ApiError.forbidden('That download link is invalid or has expired.');
    }

    const object = await c.env.DOCUMENTS.get(key);
    if (!object) throw ApiError.notFound('That file');

    const filename = new URL(c.req.url).searchParams.get('filename') ?? 'document';
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    headers.set('Cache-Control', 'private, max-age=0, no-store');
    return new Response(object.body, { headers });
  });

  return router;
}

/* ------------------------------------------------------------------ */
/* 404 & error handling                                                */
/* ------------------------------------------------------------------ */

app.notFound((c: AppContext) => {
  const requestId = c.get('requestId');
  return c.json(
    { error: { code: 'not_found', message: 'That endpoint does not exist.', request_id: requestId } },
    404
  );
});

app.onError((error, c: AppContext) => {
  const apiError = toApiError(error);
  const requestId = c.get('requestId');

  // 5xx is our fault and needs a trail; 4xx is the caller's and is expected
  // traffic, so it is logged without the noise of a stack.
  if (apiError.status >= 500) {
    logger.error('http.error', {
      request_id: requestId,
      code: apiError.code,
      route: new URL(c.req.url).pathname,
      message: apiError.message,
      cause: apiError.cause instanceof Error ? apiError.cause.message : apiError.cause,
    });
  } else {
    logger.warn('http.client_error', {
      request_id: requestId,
      code: apiError.code,
      route: new URL(c.req.url).pathname,
    });
  }

  return c.json(apiError.toJSON(requestId), apiError.status as 400);
});

/* ------------------------------------------------------------------ */
/* Worker export                                                       */
/* ------------------------------------------------------------------ */

export default {
  fetch: app.fetch.bind(app),

  async queue(batch: MessageBatch, env: WorkerEnv): Promise<void> {
    await handleNotificationQueue(batch as unknown as MessageBatch<NotificationJob>, env);
  },

  async scheduled(controller: ScheduledController, env: WorkerEnv): Promise<void> {
    await runScheduled(controller as unknown as ScheduledEvent, env);
  },
};
