// Router: maps a path (e.g. /api/properties) to a platform-agnostic handler.
// Every handler receives (req, res, parts) where `req`/`res` are the adapter
// interface below (they abstract Node's http and Workers' Request/Response).

import { handleAuth } from '../routes/auth.js';
import { handleProperties, buildPropertyFilters } from '../routes/properties.js';
import { handleBookings } from '../routes/bookings.js';
import { handleMaintenance } from '../routes/maintenance.js';
import { handleMessages } from '../routes/messages.js';
import { handleVendors } from '../routes/vendors.js';
import { handleInsurance } from '../routes/insurance.js';
import { handleMortgage } from '../routes/mortgage.js';
import { handleValuation } from '../routes/valuation.js';
import { handleNeighborhood } from '../routes/neighborhood.js';
import { handleAdmin } from '../routes/admin.js';
import { handleAuctions, handleRoommates, handleCrm, handleDocuments, handleSupport, handleMisc } from '../routes/misc.js';
import { handleDev } from '../routes/dev.js';
import { all, get } from '../db/db.js';

// Legacy-compatible route table. `prefix` lets us mount everything under /api
// while also supporting the historical /api/... shapes the old clients used.
const ROUTES = [
  { prefix: 'auth', handler: handleAuth },
  { prefix: 'properties', handler: handleProperties },
  { prefix: 'bookings', handler: handleBookings },
  { prefix: 'maintenance', handler: handleMaintenance },
  { prefix: 'messages', handler: handleMessages },
  { prefix: 'vendors', handler: handleVendors },
  { prefix: 'insurance', handler: handleInsurance },
  { prefix: 'mortgage', handler: handleMortgage },
  { prefix: 'valuation', handler: handleValuation },
  { prefix: 'neighborhood', handler: handleNeighborhood },
  { prefix: 'neighborhoods', handler: handleNeighborhood },
  { prefix: 'admin', handler: handleAdmin },
  { prefix: 'auctions', handler: handleAuctions },
  { prefix: 'roommates', handler: handleRoommates },
  { prefix: 'crm', handler: handleCrm },
  { prefix: 'leads', handler: handleCrm }, // legacy alias
  { prefix: 'documents', handler: handleDocuments },
  { prefix: 'support', handler: handleSupport },
  { prefix: 'health', handler: handleHealth },
  { prefix: 'meta', handler: handleMisc },
  { prefix: 'dev', handler: handleDev },
];

export async function handleHealth(req, res) {
  let dbOk = true;
  let users = -1;
  try {
    const row = await get('SELECT COUNT(*) AS c FROM users');
    users = row ? row.c : -1;
  } catch (e) {
    dbOk = false;
  }
  return { status: 200, body: {
    status: dbOk ? 'OK' : 'DEGRADED',
    service: 'agently-api',
    version: '2.0.0',
    time: new Date().toISOString(),
    database: { connected: dbOk, users },
  }};
}

export async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  // Strip any /api prefix — both /api/properties and /properties work.
  const normalized = pathname.replace(/^\/api(?=\/|$)/, '');
  const parts = normalized.split('/').filter(Boolean);

  if (normalized === '/' || normalized === '') {
    return handleHealth(req, res);
  }

  let func;
  for (const r of ROUTES) {
    if (parts[0] === r.prefix) {
      func = r.handler;
      break;
    }
  }

  if (!func) {
    return { status: 404, body: { error: 'Route not found', path: pathname } };
  }

  // Also expose query params as an object for ergonomic access in handlers.
  const query = {};
  url.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  req.query = query;
  req.urlObject = url;
  req.params = parts.slice(1);

  return func(req, res, parts.slice(1));
}
