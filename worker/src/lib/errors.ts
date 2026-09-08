/**
 * Canonical API error type.
 *
 * Every failure path funnels through `ApiError` so the HTTP layer can produce a
 * consistent envelope:
 *
 *   { "error": { "code": "...", "message": "...", "request_id": "..." } }
 *
 * `status`, `code` and `message` are deliberately separated: the status and code
 * are stable contract values, while the message is written for humans and is
 * safe to show in the UI.
 */

export type ErrorCode =
  | 'bad_request'
  | 'validation_failed'
  | 'unauthorized'
  | 'invalid_credentials'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'internal_error'
  | 'service_unavailable';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  invalid_credentials: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  payload_too_large: 413,
  unsupported_media_type: 415,
  internal_error: 500,
  service_unavailable: 503,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  /** Never shown to users; recorded for support/debugging. */
  override readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, options: { details?: unknown; cause?: unknown } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options.details;
    this.cause = options.cause;
  }

  static badRequest(message = 'The request could not be understood.', details?: unknown) {
    return new ApiError('bad_request', message, { details });
  }

  static validation(message = 'Some of the information provided is not valid.', details?: unknown) {
    return new ApiError('validation_failed', message, { details });
  }

  static unauthorized(message = 'Sign in to continue.') {
    return new ApiError('unauthorized', message);
  }

  static invalidCredentials() {
    return new ApiError('invalid_credentials', 'The email or password you entered is incorrect.');
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError('forbidden', message);
  }

  static notFound(what = 'Resource') {
    return new ApiError('not_found', `${what} could not be found.`);
  }

  static conflict(message: string) {
    return new ApiError('conflict', message);
  }

  static payloadTooLarge(message = 'That file is too large to upload.') {
    return new ApiError('payload_too_large', message);
  }

  static rateLimited(retryAfterSeconds: number) {
    return new ApiError('rate_limited', 'Too many requests. Please try again shortly.', {
      details: { retry_after: retryAfterSeconds },
    });
  }

  static internal(cause?: unknown) {
    return new ApiError('internal_error', 'Something went wrong on our end. Please try again.', { cause });
  }

  toJSON(requestId?: string): { error: Record<string, unknown> } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
        ...(requestId ? { request_id: requestId } : {}),
      },
    };
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Maps anything thrown inside a handler onto a safe, loggable ApiError. */
export function toApiError(value: unknown): ApiError {
  if (isApiError(value)) return value;
  return ApiError.internal(value);
}
