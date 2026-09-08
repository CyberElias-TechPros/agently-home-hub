/** Bindings and configuration available on every request. */

export interface Env {
  /** D1 — relational data. */
  DB: D1Database;
  /** R2 — document bytes. */
  DOCUMENTS: R2Bucket;
  /** KV — cached reads and feature flags. */
  CACHE: KVNamespace;
  /** KV — rate-limit counters. */
  RATE_LIMITS: KVNamespace;
  /** Queue — asynchronous notification delivery. */
  NOTIFICATION_QUEUE: Queue<NotificationJob>;
  /** Durable Object — websocket presence for messaging. */
  REALTIME_HUB: DurableObjectNamespace;

  JWT_SECRET: string;
  ENVIRONMENT: string;
  API_VERSION: string;
  ALLOWED_ORIGINS: string;

  ACCESS_TOKEN_TTL_SECONDS?: string;
  REFRESH_TOKEN_TTL_SECONDS?: string;
  MAX_UPLOAD_BYTES?: string;

  /** Optional: when set, password reset / verification links are emailed. */
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  PUBLIC_WEB_URL?: string;
}

export type NotificationJob =
  | { type: 'email'; to: string; subject: string; html: string; text: string }
  | { type: 'notification'; user_id: string; notification_type: string; title: string; body: string; resource_type?: string; resource_id?: string };

export interface AppConfig {
  environment: string;
  apiVersion: string;
  allowedOrigins: string[];
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  maxUploadBytes: number;
  issuer: string;
  audience: string;
  publicWebUrl: string;
}

const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function parseIntWithDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env: Env): AppConfig {
  const allowedOrigins = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    environment: env.ENVIRONMENT ?? 'development',
    apiVersion: env.API_VERSION ?? 'v1',
    allowedOrigins,
    accessTokenTtlSeconds: parseIntWithDefault(env.ACCESS_TOKEN_TTL_SECONDS, 900),
    refreshTokenTtlSeconds: parseIntWithDefault(env.REFRESH_TOKEN_TTL_SECONDS, 60 * 60 * 24 * 30),
    maxUploadBytes: parseIntWithDefault(env.MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
    issuer: 'agently-api',
    audience: 'agently-web',
    publicWebUrl: env.PUBLIC_WEB_URL ?? 'https://agently.app',
  };
}
