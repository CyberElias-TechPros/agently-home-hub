/**
 * Structured logging.
 *
 * Logs are single-line JSON so they are queryable in `wrangler tail` and in
 * Cloudflare's log push. Sensitive values are never logged: only ids, durations
 * and error codes.
 */

export interface LogContext {
  request_id?: string;
  user_id?: string;
  route?: string;
  method?: string;
  status?: number;
  duration_ms?: number;
  [key: string]: unknown;
}

const REDACTED_KEYS = new Set([
  'password',
  'current_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'api_key',
]);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]';
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => redact(entry, depth + 1));
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(entry, depth + 1);
    }
    return result;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…[truncated]`;
  return value;
}

export function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context: LogContext = {}): void {
  const entry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...(redact(context) as Record<string, unknown>),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
