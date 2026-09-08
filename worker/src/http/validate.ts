import { z } from 'zod';
import { ApiError } from '../lib/errors';

/**
 * Request validation.
 *
 * Every handler validates with Zod before touching business logic, so
 * untrusted input never reaches the database. Field names in error details
 * match the request payload, which lets the frontend bind messages to inputs.
 */

export async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw ApiError.badRequest('Expected a JSON request body.');
  }
  try {
    return await request.json();
  } catch {
    throw ApiError.badRequest('The request body is not valid JSON.');
  }
}

export type Parsed<T> = T;

/** Validates and returns typed, coerced data or throws a 422. */
export function validate<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw ApiError.validation('Please correct the highlighted fields.', flattenIssues(result.error));
  }
  return result.data;
}

export function flattenIssues(error: z.ZodError): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : '_';
    const list = issues[path] ?? [];
    list.push(issue.message);
    issues[path] = list;
  }
  return issues;
}

/** Validates query parameters; unknown keys are stripped rather than rejected. */
export function validateQuery<S extends z.ZodTypeAny>(schema: S, params: URLSearchParams): z.infer<S> {
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const all = params.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  return validate(schema, raw);
}

/* ------------------------------------------------------------------ */
/* Shared primitives                                                   */
/* ------------------------------------------------------------------ */

export const idSchema = z.string().uuid('Must be a valid identifier.');

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .toLowerCase()
  .email('Enter a valid email address.');

export const passwordSchema = z.string().min(10, 'Use at least 10 characters.').max(200);

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'That date is not valid.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().optional(),
});

export function moneyToMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function minorUnitsToMoney(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined) return null;
  return amount / 100;
}
