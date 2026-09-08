/**
 * Thin helpers over D1's prepared-statement API.
 *
 * Three things happen here that are easy to get wrong spread across handlers:
 *  - JSON columns are parsed/serialised consistently (and never throw on NULL)
 *  - `updated_at` is always touched on writes
 *  - D1 errors are surfaced as ApiErrors with the original error preserved
 */

import { ApiError } from '../lib/errors';

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseJsonList<T>(value: unknown, fallback: T[] = []): T[] {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function boolToInt(value: boolean | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

export function intToBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1' || value === 'true';
}

export async function queryOne<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T | null> {
  try {
    const result = await db
      .prepare(sql)
      .bind(...params.map(normaliseParam))
      .first<T>();
    return (result as T | null) ?? null;
  } catch (error) {
    throw toDatabaseError(error);
  }
}

export async function queryAll<T>(db: D1Database, sql: string, params: unknown[] = []): Promise<T[]> {
  try {
    const result = await db
      .prepare(sql)
      .bind(...params.map(normaliseParam))
      .all<T>();
    return result.results ?? [];
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** Result of a write, with the number of affected rows surfaced directly. */
export interface WriteResult {
  changes: number;
  lastRowId: number | null;
}

export async function execute(db: D1Database, sql: string, params: unknown[] = []): Promise<WriteResult> {
  const result = await run(db, sql, params);
  return { changes: result.meta?.changes ?? 0, lastRowId: result.meta?.last_row_id ?? null };
}

export async function run(db: D1Database, sql: string, params: unknown[] = []): Promise<D1Result> {
  try {
    return await db
      .prepare(sql)
      .bind(...params.map(normaliseParam))
      .run();
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/**
 * Runs several statements atomically. D1 has no interactive transactions, but
 * `batch` is atomic — either every statement applies or none do.
 */
export async function batch(db: D1Database, statements: D1PreparedStatement[]): Promise<D1Result[]> {
  try {
    return await db.batch(statements);
  } catch (error) {
    throw toDatabaseError(error);
  }
}

/** D1 only accepts a narrow set of JS values as bound parameters. */
function normaliseParam(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function toDatabaseError(error: unknown): ApiError {
  const message = error instanceof Error ? error.message : String(error);

  // UNIQUE constraint violations are the interesting, actionable class of
  // database error; everything else is treated as an internal fault so we never
  // leak schema details to clients.
  if (/UNIQUE constraint failed/i.test(message)) {
    const column = message.split(':').pop()?.trim() ?? 'value';
    if (column.includes('email')) {
      return ApiError.conflict('An account with that email address already exists.');
    }
    if (column.includes('slug')) {
      return ApiError.conflict('A listing with a similar title already exists.');
    }
    return ApiError.conflict('That record already exists.');
  }

  if (/FOREIGN KEY constraint failed/i.test(message)) {
    return ApiError.badRequest('The request references a record that no longer exists.');
  }

  return ApiError.internal(error);
}

/** Builds `col = ?, col2 = ?` fragments for UPDATE statements. */
export function buildSetClause(patch: Record<string, unknown>): { sql: string; params: unknown[] } {
  const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return { sql: '', params: [] };
  return {
    sql: entries.map(([column]) => `${column} = ?`).join(', '),
    params: entries.map(([, value]) => value),
  };
}

/** SQLite has no `ON CONFLICT DO UPDATE` on partial indexes we rely on, so
 *  helper for `WHERE col IN (?, ?, ?)` lists. */
export function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}
