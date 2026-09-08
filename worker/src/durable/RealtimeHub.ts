import { DurableObject } from 'cloudflare:workers';

/**
 * Realtime hub for messaging.
 *
 * One Durable Object instance per conversation. It holds the set of open
 * websockets for that conversation and fans out "something changed" pings so
 * clients can refetch, rather than trying to push message bodies (which would
 * duplicate the API's own serialisation and authorisation rules).
 *
 * It is deliberately stateless beyond the socket set: the conversation is
 * always re-read from D1 by the client, so a hibernated or evicted object can
 * never serve stale or unauthorised data.
 */

interface Attachment {
  userId: string;
  conversationId: string;
}

interface Env {
  JWT_SECRET: string;
}

export class RealtimeHub extends DurableObject<Env> {
  private readonly sockets = new Map<WebSocket, Attachment>();

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/broadcast') {
      const payload = (await request.json().catch(() => ({}))) as { conversation_id?: string };
      this.broadcast({ type: 'conversation_updated', conversation_id: payload.conversation_id });
      return Response.json({ delivered: this.sockets.size });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket upgrade.', { status: 426 });
    }

    const userId = url.searchParams.get('user_id');
    const conversationId = url.searchParams.get('conversation_id');
    if (!userId || !conversationId) {
      return new Response('user_id and conversation_id are required.', { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    // Accepting with the hibernation API lets the object be evicted from memory
    // while sockets stay open — far cheaper than holding an isolate per chat.
    this.ctx.acceptWebSocket(server);
    this.sockets.set(server, { userId, conversationId });
    server.serializeAttachment({ userId, conversationId });

    this.broadcast({ type: 'presence', conversation_id: conversationId, online: this.sockets.size });

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(socket: WebSocket, message: ArrayBuffer | string): Promise<void> {
    // Clients only send heartbeats; anything else is ignored so a malformed
    // frame from one tab cannot affect another.
    if (typeof message === 'string' && message === 'ping') {
      socket.send(JSON.stringify({ type: 'pong' }));
    }
  }

  override async webSocketClose(socket: WebSocket): Promise<void> {
    this.sockets.delete(socket);
    void this.broadcast({ type: 'presence', online: this.sockets.size });
  }

  override async webSocketError(socket: WebSocket): Promise<void> {
    this.sockets.delete(socket);
  }

  private broadcast(event: Record<string, unknown>): void {
    const payload = JSON.stringify({ ...event, at: new Date().toISOString() });
    for (const socket of this.sockets.keys()) {
      try {
        socket.send(payload);
      } catch {
        this.sockets.delete(socket);
      }
    }
  }
}
