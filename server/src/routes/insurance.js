// Insurance: providers, quotes, policies, claims, recommendations.

import { ok, created, badRequest, unauthorized, notFound, parseJson, currentUser, parsePagination, paginated } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

export async function handleInsurance(req, res, parts) {
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'providers') return listProviders(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'quotes') return listQuotes(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'quotes') return createQuote(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'policies') return listPolicies(req, res);
  if (req.method === 'POST' && parts.length === 2 && parts[0] === 'quotes' && parts[1] === 'purchase') return purchasePolicy(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'claims') return listClaims(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'claims') return fileClaim(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'recommendations') return recommendations(req, res);
  return notFound(res, 'Insurance route not found');
}

async function listProviders(req, res) {
  const { page, limit, offset } = parsePagination(req.query || {});
  const totalRow = await get('SELECT COUNT(*) AS c FROM insurance_providers');
  const rows = await all('SELECT * FROM insurance_providers ORDER BY rating DESC LIMIT ? OFFSET ?', [limit, offset]);
  const items = rows.map((p) => ({
    id: p.id, name: p.name, description: p.description, logo: p.logo_url,
    coverageTypes: safeJson(p.coverage_types, []), rating: p.rating, reviewCount: p.review_count,
  }));
  return paginated(res, items, totalRow.c, page, limit);
}

async function listQuotes(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT q.*, ip.name AS provider_name FROM insurance_quotes q
     JOIN insurance_providers ip ON ip.id = q.provider_id
     WHERE q.user_id = ? AND q.status = 'active' ORDER BY q.created_at DESC`,
    [user.id]
  );
  return ok(res, { items: rows.map(quoteView) });
}

function quoteView(q) {
  return {
    id: q.id, providerId: q.provider_id, providerName: q.provider_name,
    propertyId: q.property_id, coverageType: q.coverage_type, coverageAmount: q.coverage_amount,
    premium: q.premium, deductible: q.deductible, termMonths: q.term_months,
    validUntil: q.valid_until, createdAt: q.created_at,
  };
}

async function createQuote(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { providerId, propertyId, coverageType = 'Property', coverageAmount, deductible = 0, termMonths = 12 } = body;
  if (!providerId) return badRequest(res, 'providerId is required');
  const provider = await get('SELECT * FROM insurance_providers WHERE id = ?', [providerId]);
  if (!provider) return notFound(res, 'Provider not found');

  const amount = parseInt(coverageAmount, 10) || 0;
  if (amount <= 0) return badRequest(res, 'coverageAmount must be positive');

  // Deterministic premium model (0.2% of coverage + deductible factor).
  const premium = Math.max(5000, Math.round((amount * 0.002) + (deductible * 0.02) + (Number(termMonths) * 500)));
  const id = newId('insq');
  const valid_until = new Date(Date.now() + 7 * 86400000).toISOString();
  await run(
    `INSERT INTO insurance_quotes (id, provider_id, property_id, user_id, coverage_type, coverage_amount, premium, deductible, term_months, status, valid_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [id, providerId, propertyId || null, user.id, coverageType, amount, premium, deductible, Number(termMonths), valid_until]
  );
  const row = await get(`SELECT q.*, ip.name AS provider_name FROM insurance_quotes q JOIN insurance_providers ip ON ip.id = q.provider_id WHERE q.id = ?`, [id]);
  return created(res, { message: 'Quote generated', item: quoteView(row) });
}

async function purchasePolicy(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { quoteId } = body;
  if (!quoteId) return badRequest(res, 'quoteId is required');
  const quote = await get('SELECT * FROM insurance_quotes WHERE id = ?', [quoteId]);
  if (!quote) return notFound(res, 'Quote not found');
  if (quote.user_id !== user.id) return unauthorized(res, 'Not your quote');

  const id = newId('insp');
  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + Number(quote.term_months || 12));
  const policyNumber = `AGY-POL-${Date.now().toString(36).toUpperCase()}`;
  await run(
    `INSERT INTO insurance_policies (id, quote_id, user_id, provider_id, property_id, policy_number, coverage_amount, premium, start_date, end_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [id, quote.id, user.id, quote.provider_id, quote.property_id, policyNumber, quote.coverage_amount, quote.premium, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  );
  await run(`UPDATE insurance_quotes SET status = 'purchased' WHERE id = ?`, [quote.id]);
  const row = await get('SELECT * FROM insurance_policies WHERE id = ?', [id]);
  return created(res, { message: 'Policy activated', item: policyView(row) });
}

function policyView(p) {
  return {
    id: p.id, quoteId: p.quote_id, providerId: p.provider_id, propertyId: p.property_id,
    policyNumber: p.policy_number, coverageAmount: p.coverage_amount, premium: p.premium,
    startDate: p.start_date, endDate: p.end_date, status: p.status,
  };
}

async function listPolicies(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all('SELECT * FROM insurance_policies WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, { items: rows.map(policyView) });
}

async function listClaims(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all('SELECT * FROM insurance_claims WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, {
    items: rows.map((c) => ({
      id: c.id, policyId: c.policy_id, claimType: c.claim_type, description: c.description,
      incidentDate: c.incident_date, status: c.status, claimAmount: c.claim_amount, createdAt: c.created_at,
    })),
  });
}

async function fileClaim(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { policyId, claimType, description, incidentDate, claimAmount } = body;
  if (!policyId || !description) return badRequest(res, 'policyId and description are required');
  const policy = await get('SELECT * FROM insurance_policies WHERE id = ?', [policyId]);
  if (!policy) return notFound(res, 'Policy not found');
  if (policy.user_id !== user.id) return unauthorized(res, 'Not your policy');

  const id = newId('insc');
  await run(
    `INSERT INTO insurance_claims (id, policy_id, user_id, claim_type, description, incident_date, status, claim_amount)
     VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?)`,
    [id, policyId, user.id, claimType || 'other', String(description), incidentDate || null, parseInt(claimAmount, 10) || 0]
  );
  return created(res, { message: 'Claim filed', item: { id, policyId, claimType, description, status: 'submitted' } });
}

async function recommendations(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const props = await all(
    `SELECT p.*, b.id AS booking_id FROM properties p
     JOIN bookings b ON b.property_id = p.id
     WHERE b.tenant_id = ? AND b.status IN ('confirmed','completed')`,
    [user.id]
  );
  const items = props.map((p) => ({
    propertyId: p.id,
    propertyTitle: p.title,
    recommendedCoverage: Math.round(p.price * 12 * 0.9),
    recommendedDeductible: Math.round(p.price * 0.1),
    riskFactors: ['Rental occupancy'],
  }));
  return ok(res, { items });
}
