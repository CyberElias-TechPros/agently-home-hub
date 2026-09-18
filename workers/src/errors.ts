/**
 * Typed API error with HTTP status + error code.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiError {
    return new ApiError(400, 'bad_request', message, details);
  }
  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(401, 'unauthorized', message);
  }
  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, 'forbidden', message);
  }
  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, 'not_found', message);
  }
  static conflict(message = 'Conflict'): ApiError {
    return new ApiError(409, 'conflict', message);
  }
  static tooMany(message = 'Too many requests'): ApiError {
    return new ApiError(429, 'rate_limited', message);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
