/**
 * Socket.IO-compatible long-polling shim.
 *
 * Cloudflare Workers cannot hold persistent Engine.IO transport sessions the
 * way a Node process can, so real-time degrades gracefully:
 *   • handshake (`?EIO=4&transport=polling`, no sid)  → open packet
 *   • every poll (`?EIO=4&transport=polling&sid=…`)   → ping/noop packet
 *
 * The frontend's socket.io-client is configured with `reconnection: true` and
 * transparently falls back to REST polling for messages & notifications, so
 * the UX never breaks. When Durable Objects are enabled later, upgrade this
 * shim to a real WebSocket room implementation.
 */

import { Hono } from 'hono';
import type { Env, Variables } from './types';
import { randomToken } from './crypto';
import { corsHeaders } from './http';
import { allowAllOrigins } from './config';

type Ctx = { Bindings: Env; Variables: Variables };

const encoder = new TextEncoder();

function frame(packet: string): string {
  // Engine.IO frames are plain text (length-prefixed), not binary.
  return `${packet.length}:${packet}`;
}

export const socketShim = new Hono<Ctx>();

socketShim.get('/', (c) => {
  const headers = {
    ...corsHeaders(c, allowAllOrigins(c.env)),
    'content-type': 'text/plain; charset=UTF-8',
  };
  const hasSid = Boolean(c.req.query('sid'));

  if (!hasSid) {
    // Engine.IO handshake → open packet (0)
    const payload = JSON.stringify({
      sid: randomToken(20),
      upgrades: [],
      pingInterval: 25000,
      pingTimeout: 20000,
      maxPayload: 1048576,
    });
    return c.body(frame(`0${payload}`), 200, headers);
  }

  // Poll → Engine.IO "noop" keep-alive packet
  return c.body(frame('2'), 200, headers);
});

socketShim.post('/', (c) => {
  const headers = {
    ...corsHeaders(c, allowAllOrigins(c.env)),
    'content-type': 'text/plain; charset=UTF-8',
  };
  // Acknowledge whatever was POSTed so clients transition cleanly.
  return c.body(frame('2'), 200, headers);
});
