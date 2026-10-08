/**
 * Agently — Cloudflare Workers API entrypoint.
 *
 * One Worker serves:
 *   • /api/*        — REST API (JSON)
 *   • /socket.io/*  — Socket.IO-compatible long-polling shim (used by the
 *                     frontend's socket.io-client; reconnection is handled
 *                     by polling the REST messaging endpoints instead)
 *   • /*            — static assets / SPA fallback (when [assets] configured)
 */

import { Hono } from 'hono';
import { DurableObject } from 'cloudflare:workers';
import type { Env, Variables } from './types';
import { ApiError, isApiError } from './errors';
import { corsHeaders, readJson } from './http';
import { allowAllOrigins, isProd } from './config';

import { auth } from './routes/auth';
import { properties } from './routes/properties';
import { bookings } from './routes/bookings';
import { maintenance } from './routes/maintenance';
import { messages } from './routes/messages';
import { leads } from './routes/leads';
import { marketplace } from './routes/marketplace';
import { misc } from './routes/misc';
import { socketShim } from './socket-shim';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/* ------------------------------------------------------------------ */
/* Global middleware                                                   */
/* ------------------------------------------------------------------ */
app.use('/api/*', async (c, next) => {
  const allowAll = allowAllOrigins(c.env);
  const headers = corsHeaders(c, allowAll);

  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  await next();
});

app.use('/socket.io/*', async (c, next) => {
  const headers = corsHeaders(c, allowAllOrigins(c.env));
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  await next();
});

/* ------------------------------------------------------------------ */
/* Health & meta                                                       */
/* ------------------------------------------------------------------ */
app.get('/', (c) => c.json({
  success: true,
  data: {
    name: 'Agently API',
    version: '2.0.0',
    environment: c.env.ENVIRONMENT ?? 'production',
    endpoints: ['/api/health', '/api/properties', '/api/auth/login'],
  },
}));

app.get('/api/health', async (c) => {
  let db = 'ok';
  try {
    await c.env.DB.prepare('SELECT 1 AS ok').first();
  } catch {
    db = 'unavailable';
  }
  return c.json({
    success: true,
    data: {
      status: db === 'ok' ? 'healthy' : 'degraded',
      database: db,
      service: 'agently-api',
      version: '2.0.0',
      time: new Date().toISOString(),
    },
  });
});

app.get('/api/health/ready', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT 1 AS ok').first();
    if (!row) throw new Error('no db row');
    return c.json({ success: true, data: { ready: true } });
  } catch {
    return c.json({ success: true, data: { ready: false } }, 503);
  }
});

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */
app.route('/api/auth', auth);
app.route('/api/properties', properties);
app.route('/api/bookings', bookings);
app.route('/api/maintenance', maintenance);
app.route('/api/messages', messages);
app.route('/api/leads', leads);
// misc registers /contact /payments /mortgage/* /neighborhood/* /users/:id
app.route('/api', misc);
// marketplace registers /vendors /insurance/* /auctions* /valuation /neighborhood
// /roommates/* /agents* /admin/* /qa/*
app.route('/api', marketplace);

/* ------------------------------------------------------------------ */
/* Socket.IO compatibility shim (long-polling only)                    */
/* ------------------------------------------------------------------ */
app.route('/socket.io', socketShim);
app.route('/socket.io/*', socketShim);

/* ------------------------------------------------------------------ */
/* 404 for unknown API routes                                          */
/* ------------------------------------------------------------------ */
app.notFound((c) => {
  const headers = corsHeaders(c, allowAllOrigins(c.env));
  if (c.req.path.startsWith('/api/')) {
    return new Response(JSON.stringify({ success: false, error: 'Route not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json', ...headers },
    });
  }
  return new Response('Not found', { status: 404, headers });
});

/* ------------------------------------------------------------------ */
/* Error handling                                                      */
/* ------------------------------------------------------------------ */
app.onError((err, c) => {
  const headers = corsHeaders(c, allowAllOrigins(c.env));
  if (isApiError(err)) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    }), {
      status: err.status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  }
  console.error('Unhandled error', err);
  return new Response(JSON.stringify({
    success: false,
    error: 'Internal server error',
    code: 'internal_error',
  }), {
    status: 500,
    headers: { 'content-type': 'application/json', ...headers },
  });
});

/* ------------------------------------------------------------------ */
/* Request logging (dev-friendly)                                      */
/* ------------------------------------------------------------------ */
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  if (isProd(c.env) && c.req.path.startsWith('/api/')) {
    console.log(JSON.stringify({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Date.now() - start,
    }));
  }
});

void readJson;

// Compatibility export: a previous deployment of this worker bound a
// ChatRoom Durable Object namespace, and Cloudflare requires every new
// version to keep exporting the class so existing instances are not
// orphaned. Not used by the current code.
export class ChatRoom extends DurableObject {}

export default app;
