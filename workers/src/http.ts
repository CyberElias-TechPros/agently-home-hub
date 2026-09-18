/**
 * Small HTTP helpers.
 */

import type { Context } from 'hono';

/** Read a JSON body safely (returns {} when absent/malformed). */
export async function readJson(c: Context): Promise<any> {
  const raw = await c.req.text().catch(() => '');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Cheap but effective structured logging. */
export function log(c: Context, level: 'info' | 'warn' | 'error', msg: string, extra?: unknown): void {
  const line = {
    level,
    time: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    msg,
  };
  if (level === 'error') console.error(JSON.stringify({ ...line, extra: extra ?? null }));
  else if (level === 'warn') console.warn(JSON.stringify({ ...line, extra: extra ?? null }));
  else console.log(JSON.stringify(line));
}

/** CORS helper — safe origins first, uses env allow-list. */
export function corsHeaders(c: Context, allowAll: boolean): Record<string, string> {
  const origin = c.req.header('Origin');
  const allowed = allowAll ? '*' : (origin ?? '*');
  return {
    'Access-Control-Allow-Origin': allowed,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}
