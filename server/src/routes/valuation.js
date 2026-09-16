// Property valuation & inspection routes.

import { ok, created, badRequest, unauthorized, notFound, parseJson, currentUser } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

// Deterministic AVM-style estimate derived from property attributes.
export function estimateValue(p) {
  const basePerSqm = p.city === 'Ikoyi' ? 4800 : p.city === 'Victoria Island' || p.city === 'Wuse 2' ? 3800 : p.city === 'Lekki' ? 3200 : p.city === 'Ikeja' ? 2600 : 2000;
  let value = (p.area_sqm || 60) * basePerSqm;
  value += (p.bedrooms || 0) * 250000;
  value += (p.year_built || 2020) >= 2020 ? 150000 : 0;
  value *= p.type === 'house' ? 1.2 : 1.0;
  const low = Math.round(value * 0.92);
  const high = Math.round(value * 1.08);
  return { estimate: Math.round(value), low, high, confidence: low > 0 ? 87 : 0 };
}

export async function handleValuation(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listValuations(req, res);
  if (req.method === 'POST' && parts.length === 0) return requestValuation(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'inspections') return listInspections(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'inspections') return requestInspection(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'reports') return listReports(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'disputes') return listDisputes(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'disputes') return createDispute(req, res);
  if (parts.length === 1) {
    return getValuation(req, res, parts[0]);
  }
  return notFound(res, 'Valuation route not found');
}

async function requestValuation(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { propertyId } = body;
  if (!propertyId) return badRequest(res, 'propertyId is required');
  const p = await get('SELECT * FROM properties WHERE id = ?', [propertyId]);
  if (!p) return notFound(res, 'Property not found');

  const v = estimateValue(p);
  // Comparables from the same city.
  const comps = await all(
    `SELECT id, title, price, city, area_sqm, bedrooms FROM properties WHERE city = ? AND id != ? ORDER BY ABS(price - ?) ASC LIMIT 4`,
    [p.city, propertyId, v.estimate]
  );
  const id = newId('val');
  const factors = [
    { factor: 'Location', impact: 'positive', weight: 30, description: `${p.city}, ${p.state}` },
    { factor: 'Size', impact: 'positive', weight: 25, description: `${p.area_sqm} m²` },
    { factor: 'Condition', impact: p.year_built >= 2020 ? 'positive' : 'neutral', weight: 20, description: `Built ${p.year_built || 'unknown'}` },
  ];
  await run(
    `INSERT INTO valuation_reports (id, property_id, requested_by, avm_value, confidence_score, methodology, factors, comparables, price_range)
     VALUES (?, ?, ?, ?, ?, 'avm', ?, ?, ?)`,
    [id, propertyId, user.id, v.estimate, v.confidence, JSON.stringify(factors), JSON.stringify(comps), JSON.stringify({ low: v.low, high: v.high })]
  );
  return created(res, {
    message: 'Valuation generated',
    item: {
      id, propertyId, avmValue: v.estimate, confidenceScore: v.confidence, methodology: 'avm',
      factors, comparables: comps, priceRange: { low: v.low, high: v.high }, valuationDate: now(),
    },
  });
}

async function listValuations(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT * FROM valuation_reports WHERE requested_by = ? ORDER BY created_at DESC`,
    [user.id]
  );
  return ok(res, { items: rows.map(reportView) });
}

async function getValuation(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const row = await get('SELECT * FROM valuation_reports WHERE id = ?', [id]);
  if (!row) return notFound(res, 'Valuation not found');
  return ok(res, { item: reportView(row) });
}

function reportView(r) {
  return {
    id: r.id, propertyId: r.property_id, avmValue: r.avm_value, confidenceScore: r.confidence_score,
    methodology: r.methodology, factors: safeJson(r.factors, []), comparables: safeJson(r.comparables, []),
    priceRange: safeJson(r.price_range, {}), createdAt: r.created_at,
  };
}

async function listInspections(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all('SELECT * FROM inspection_reports WHERE requested_by = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, {
    items: rows.map((r) => ({
      id: r.id, propertyId: r.property_id, inspectorName: r.inspector_name, scheduledDate: r.scheduled_date,
      status: r.status, checklist: safeJson(r.checklist, []), notes: r.notes, photos: safeJson(r.photos, []), createdAt: r.created_at,
    })),
  });
}

async function requestInspection(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { propertyId, scheduledDate, notes } = body;
  if (!propertyId || !scheduledDate) return badRequest(res, 'propertyId and scheduledDate are required');
  const p = await get('SELECT id FROM properties WHERE id = ?', [propertyId]);
  if (!p) return notFound(res, 'Property not found');
  const id = newId('insp');
  await run(
    `INSERT INTO inspection_reports (id, property_id, requested_by, scheduled_date, status, checklist, notes, photos)
     VALUES (?, ?, ?, ?, 'scheduled', '[]', ?, '[]')`,
    [id, propertyId, user.id, scheduledDate, notes || '']
  );
  return created(res, { message: 'Inspection scheduled', item: { id, propertyId, scheduledDate, status: 'scheduled' } });
}

async function listReports(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT v.*, p.title AS property_title, p.city AS property_city
     FROM valuation_reports v LEFT JOIN properties p ON p.id = v.property_id
     WHERE v.requested_by = ? ORDER BY v.created_at DESC`,
    [user.id]
  );
  return ok(res, {
    items: rows.map((r) => ({
      ...reportView(r),
      propertyTitle: r.property_title,
      propertyCity: r.property_city,
    })),
  });
}

async function listDisputes(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    'SELECT * FROM valuation_disputes WHERE client_id = ? ORDER BY created_at DESC',
    [user.id]
  );
  return ok(res, { items: rows.map(disputeView) });
}

async function createDispute(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { valuationId, propertyId, reason } = body;
  if (!reason) return badRequest(res, 'reason is required');
  const id = newId('vdsp');
  await run(
    `INSERT INTO valuation_disputes (id, valuation_id, property_id, client_id, reason, status, resolution)
     VALUES (?, ?, ?, ?, ?, 'under_review', '')`,
    [id, valuationId || null, propertyId || null, user.id, reason]
  );
  return created(res, {
    message: 'Dispute filed',
    item: disputeView({ id, valuation_id: valuationId || null, property_id: propertyId || null, client_id: user.id, reason, status: 'under_review', resolution: '', created_at: now() }),
  });
}

function disputeView(r) {
  return {
    id: r.id, valuationId: r.valuation_id, propertyId: r.property_id, clientId: r.client_id,
    reason: r.reason, status: r.status, resolution: r.resolution || '', createdAt: r.created_at,
  };
}
