// Helpers shared by route handlers: JSON responses, CORS, auth, pagination.
// Runtime-agnostic: no Node-only imports, no Express dependency.

import { originAllowed } from '../config.js';
import { verifyToken } from './jwt.js';
import config from '../config.js';

export function applyCors(req, res) {
  const origin = req.getHeader('origin') || req.getHeader('referer')?.split('/').slice(0, 3).join('/') || '';
  if (origin && originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (originAllowed('*') === false) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function json(res, status, body) {
  const data = JSON.stringify(body);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status);
  res.send(data);
}

export function ok(res, body = {}) {
  return json(res, 200, body);
}

export function created(res, body = {}) {
  return json(res, 201, body);
}

export function badRequest(res, error, extra = {}) {
  return json(res, 400, { error, ...extra });
}

export function unauthorized(res, error = 'Authentication required') {
  return json(res, 401, { error });
}

export function forbidden(res, error = 'Access denied') {
  return json(res, 403, { error });
}

export function notFound(res, error = 'Not found') {
  return json(res, 404, { error });
}

export function conflict(res, error) {
  return json(res, 409, { error });
}

export function tooMany(res, error = 'Too many attempts. Please try again later.') {
  return json(res, 429, { error });
}

export function serverError(res, error = 'Internal server error') {
  return json(res, 500, { error });
}

// Headers parsing compatible with both R2-style Request and our Node adapter.
export function authTokenFromRequest(req) {
  const auth = req.getHeader('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1] : null;
}

export async function currentUser(req) {
  const token = authTokenFromRequest(req);
  if (!token) return null;
  const payload = await verifyToken(token, config.jwtSecret, 'access');
  if (!payload) return null;
  return {
    id: String(payload.sub),
    email: payload.email,
    role: payload.role,
    name: payload.name,
  };
}

export function assertAuth(req) {
  if (!req.user) {
    unauthorized(req, 'Authentication required');
    return false;
  }
  return true;
}

export function assertRole(req, roles) {
  if (!assertAuth(req)) return false;
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(req.user.role)) {
    forbidden(req, 'Insufficient permissions');
    return false;
  }
  return true;
}

export function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

export function parsePagination(queryObj) {
  const page = Math.max(1, parseInt(queryObj.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryObj.limit || '20', 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export function paginated(res, rows, total, page, limit) {
  return json(res, 200, {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: page * limit < total,
    },
  });
}

export function parseJson(req) {
  try {
    const text = req.text || '';
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isDateStr(v) {
  return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
}

export function isEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v) && v.length <= 254;
}
