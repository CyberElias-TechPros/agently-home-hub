// Miscellaneous routes: auction, roommate, crm (leads/agents), documents,
// support, search, favorites + public meta. Runtime-agnostic.

import { ok, created, badRequest, unauthorized, forbidden, notFound, parseJson, currentUser, parsePagination, paginated } from '../lib/http.js';
import { all, get, run, newId, now } from '../db/db.js';
import { getFavorites } from './properties.js';

function safeJson(v, fb) {
  if (v == null || v === '') return fb;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fb; }
}

// ── Auctions ────────────────────────────────────────────────────────────────
export async function handleAuctions(req, res, parts) {
  // Ensure a demo auction exists (idempotent) so the happy path is never empty.
  await ensureDemoAuction();

  if (req.method === 'GET' && parts.length === 0) return listAuctions(req, res);
  if (req.method === 'GET' && parts.length === 2 && parts[0] === 'bids') return listBids(req, res, parts[1]);
  if (req.method === 'POST' && parts.length === 2 && parts[0] === 'bids') return placeBid(req, res, parts[1]);
  return listAuctions(req, res);
}

async function ensureDemoAuction() {
  const count = await get('SELECT COUNT(*) AS c FROM auctions');
  if (count.c > 0) return;
  const prop = await get(`SELECT * FROM properties WHERE status IN ('available','occupied') LIMIT 1`);
  if (!prop) return;
  const id = newId('auc');
  await run(
    `INSERT INTO auctions (id, property_id, seller_id, title, description, starting_price, reserve_price, bid_increment, start_date, end_date, status, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, 250000, datetime('now'), datetime('now','+14 days'), 'active', ?)`,
    [id, prop.id, prop.landlord_id, `${prop.title} — Quick Sale Auction`, 'Property auction hosted on Agently. Verify, bid and close securely.', prop.price * 12, prop.price * 10, safeJson(prop.images, [])[0] || null]
  );
}

async function listAuctions(req, res) {
  const rows = await all('SELECT * FROM auctions ORDER BY created_at DESC');
  const items = [];
  for (const a of rows) {
    const bids = await all('SELECT * FROM auction_bids WHERE auction_id = ? ORDER BY amount DESC', [a.id]);
    items.push({
      id: a.id, propertyId: a.property_id, sellerId: a.seller_id, title: a.title, description: a.description,
      startingPrice: a.starting_price, reservePrice: a.reserve_price, bidIncrement: a.bid_increment,
      startDate: a.start_date, endDate: a.end_date, status: a.status, image: a.image_url,
      currentBid: bids.length ? bids[0].amount : a.starting_price, totalBids: bids.length,
    });
  }
  return ok(res, { items });
}

async function listBids(req, res, auctionId) {
  const rows = await all(
    `SELECT ab.*, u.name AS bidder_name FROM auction_bids ab JOIN users u ON u.id = ab.bidder_id
     WHERE ab.auction_id = ? ORDER BY ab.amount DESC`,
    [auctionId]
  );
  return ok(res, { items: rows.map((b) => ({ id: b.id, auctionId: b.auction_id, bidderId: b.bidder_id, bidderName: b.bidder_name, amount: b.amount, createdAt: b.created_at })) });
}

async function placeBid(req, res, auctionId) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const auction = await get('SELECT * FROM auctions WHERE id = ?', [auctionId]);
  if (!auction) return notFound(res, 'Auction not found');
  if (auction.status !== 'active') return badRequest(res, 'This auction is closed');

  const body = parseJson(req) || {};
  const amount = parseInt(body.amount, 10);
  if (!Number.isFinite(amount) || amount <= 0) return badRequest(res, 'Bid amount must be positive');

  const top = await get('SELECT amount FROM auction_bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1', [auctionId]);
  const current = top ? top.amount : auction.starting_price;
  if (amount <= current) return badRequest(res, `Bid must exceed the current bid (₦${current})`);
  if (auction.reserve_price && amount > auction.reserve_price * 1.5) {
    // allow but could flag; keep permissive for happy path
  }
  const id = newId('bid');
  await run('INSERT INTO auction_bids (id, auction_id, bidder_id, amount, status) VALUES (?, ?, ?, ?, ?)', [id, auctionId, user.id, amount, 'active']);
  return created(res, { message: 'Bid placed', item: { id, auctionId, bidderId: user.id, amount } });
}

// ── Roommates ───────────────────────────────────────────────────────────────
export async function handleRoommates(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listListings(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'profiles') return listProfiles(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'profiles') return createProfile(req, res);
  if (req.method === 'POST' && parts.length === 2 && parts[0] === 'apply') return apply(req, res, parts[1]);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'applications') return applications(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'matches') return matches(req, res);
  return notFound(res, 'Roommate route not found');
}

async function listListings(req, res) {
  const rows = await all(
    `SELECT r.*, u.name AS landlord_name FROM room_listings r JOIN users u ON u.id = r.landlord_id ORDER BY r.created_at DESC`
  );
  return ok(res, { items: rows.map((r) => ({ ...r, preferences: safeJson(r.preferences, {}) })) });
}

async function listProfiles(req, res) {
  const rows = await all(
    `SELECT rp.*, u.name, u.email, u.role FROM roommate_profiles rp JOIN users u ON u.id = rp.user_id ORDER BY rp.created_at DESC`
  );
  return ok(res, { items: rows.map((r) => ({ ...r, preferences: safeJson(r.preferences, {}) })) });
}

async function createProfile(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const existing = await get('SELECT id FROM roommate_profiles WHERE user_id = ?', [user.id]);
  const values = [
    parseInt(body.age, 10) || null,
    body.occupation || null,
    parseInt(body.budgetMin, 10) || 0,
    parseInt(body.budgetMax, 10) || 0,
    JSON.stringify(body.preferences || {}),
    String(body.bio || '').trim(),
    existing ? body.verified ? 1 : 0 : 0,
    existing ? body.backgroundCheck ? 1 : 0 : 0,
  ];
  let id;
  if (existing) {
    id = existing.id;
    await run(
      `UPDATE roommate_profiles SET age = ?, occupation = ?, budget_min = ?, budget_max = ?, preferences = ?, bio = ?, verified = ?, background_check = ? WHERE id = ?`,
      [...values, existing.id]
    );
  } else {
    id = newId('rp');
    await run(
      `INSERT INTO roommate_profiles (id, user_id, age, occupation, budget_min, budget_max, preferences, bio, verified, background_check)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.id, ...values]
    );
  }
  const row = await get('SELECT * FROM roommate_profiles WHERE id = ?', [id]);
  return ok(res, { message: 'Profile saved', item: { ...row, preferences: safeJson(row.preferences, {}) } });
}

async function apply(req, res, listingId) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const listing = await get('SELECT id FROM room_listings WHERE id = ?', [listingId]);
  if (!listing) return notFound(res, 'Room listing not found');
  const body = parseJson(req) || {};
  const id = newId('rma');
  await run(
    `INSERT INTO roommate_applications (id, room_listing_id, applicant_id, message, status) VALUES (?, ?, ?, ?, 'pending')`,
    [id, listingId, user.id, String(body.message || '').trim()]
  );
  return created(res, { message: 'Application submitted', item: { id, listingId, status: 'pending' } });
}

async function applications(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT ra.*, u.name AS applicant_name FROM roommate_applications ra
     JOIN users u ON u.id = ra.applicant_id
     WHERE ra.room_listing_id IN (SELECT id FROM room_listings WHERE landlord_id = ?)
     ORDER BY ra.created_at DESC`,
    [user.id]
  );
  return ok(res, { items: rows });
}

async function matches(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all(
    `SELECT * FROM room_matches WHERE user_a = ? OR user_b = ? ORDER BY score DESC`,
    [user.id, user.id]
  );
  return ok(res, { items: rows });
}

// ── CRM: agents / leads / appointments ──────────────────────────────────────
export async function handleCrm(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listLeads(req, res);
  if (req.method === 'POST' && parts.length === 0) return createLead(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'agents') return listAgents(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'appointments') return listAppointments(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'appointments') return createAppointment(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'stats') return crmStats(req, res);
  if (parts.length === 1) {
    if (req.method === 'PUT') return updateLead(req, res, parts[0]);
    if (req.method === 'GET') return getLead(req, res, parts[0]);
    if (req.method === 'DELETE') return deleteLead(req, res, parts[0]);
  }
  return notFound(res, 'CRM route not found');
}

function requireAgent(req, res) {
  if (!currentUserImpl(req, res)) return false;
  if (!['agent', 'manager', 'admin'].includes(req.user.role)) {
    forbidden(res, 'Agent access required');
    return false;
  }
  return true;
}

// (auth is handled inline by each handler via currentUser)
function currentUserImpl(req, res) {
  if (req.user) return true;
  unauthorized(res);
  return false;
}

async function agentFor(user) {
  const existing = await get('SELECT id FROM agents WHERE user_id = ?', [user.id]);
  if (existing) return existing.id;
  const id = newId('agt');
  await run(
    `INSERT INTO agents (id, user_id, brokerage, specialization, experience_years, rating, review_count, verified, commission_rate)
     VALUES (?, ?, 'Independent', '[]', 0, 0, 0, 0, 3.0)`,
    [id, user.id]
  );
  return id;
}

async function listLeads(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const agentId = await agentFor(user);
  const rows = await all('SELECT * FROM leads WHERE agent_id = ? ORDER BY created_at DESC', [agentId]);
  return ok(res, { items: rows });
}

async function getLead(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const lead = await get('SELECT * FROM leads WHERE id = ?', [id]);
  if (!lead) return notFound(res, 'Lead not found');
  return ok(res, { item: lead });
}

async function createLead(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { firstName, lastName, email, phone, source = 'website', notes, budgetMin, budgetMax } = body;
  if (!firstName || !lastName) return badRequest(res, 'firstName and lastName are required');
  const agentId = await agentFor(user);
  const id = newId('ld');
  await run(
    `INSERT INTO leads (id, agent_id, first_name, last_name, email, phone, source, status, priority, budget_min, budget_max, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', 'medium', ?, ?, ?)`,
    [id, agentId, String(firstName), String(lastName), email || null, phone || null, source, parseInt(budgetMin, 10) || null, parseInt(budgetMax, 10) || null, notes || '']
  );
  return created(res, { message: 'Lead created', item: { id, ...body, status: 'new', priority: 'medium' } });
}

async function updateLead(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const lead = await get('SELECT * FROM leads WHERE id = ?', [id]);
  if (!lead) return notFound(res, 'Lead not found');
  const body = parseJson(req) || {};
  const upd = [];
  const params = [];
  for (const [k, col] of [['status', 'status'], ['priority', 'priority'], ['notes', 'notes'], ['firstName', 'first_name'], ['lastName', 'last_name'], ['email', 'email'], ['phone', 'phone']]) {
    if (body[k] !== undefined) { upd.push(`${col} = ?`); params.push(body[k]); }
  }
  if (!upd.length) return badRequest(res, 'No fields to update');
  upd.push('updated_at = ?');
  params.push(now());
  params.push(id);
  await run(`UPDATE leads SET ${upd.join(', ')} WHERE id = ?`, params);
  return ok(res, { message: 'Lead updated', item: await get('SELECT * FROM leads WHERE id = ?', [id]) });
}

async function deleteLead(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  await run('DELETE FROM leads WHERE id = ?', [id]);
  return ok(res, { message: 'Lead deleted' });
}

async function listAgents(req, res) {
  const rows = await all(
    `SELECT a.*, u.name, u.email, u.phone FROM agents a JOIN users u ON u.id = a.user_id ORDER BY a.rating DESC`
  );
  return ok(res, { items: rows.map((a) => ({ ...a, specialization: safeJson(a.specialization, []) })) });
}

async function listAppointments(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const agentId = await agentFor(user);
  const rows = await all('SELECT * FROM appointments WHERE agent_id = ? ORDER BY date ASC, time ASC', [agentId]);
  return ok(res, { items: rows });
}

async function createAppointment(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { date, time, notes, leadId, propertyId } = body;
  if (!date || !time) return badRequest(res, 'date and time are required');
  const agentId = await agentFor(user);
  const id = newId('apt');
  await run(`INSERT INTO appointments (id, agent_id, lead_id, property_id, date, time, status, notes) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`, [id, agentId, leadId || null, propertyId || null, date, time, notes || '']);
  return created(res, { message: 'Appointment scheduled', item: { id, date, time, status: 'scheduled' } });
}

async function crmStats(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const agentId = await agentFor(user);
  const total = await get('SELECT COUNT(*) AS c FROM leads WHERE agent_id = ?', [agentId]);
  const byStatus = await all('SELECT status, COUNT(*) AS c FROM leads WHERE agent_id = ? GROUP BY status', [agentId]);
  const appointments = await get('SELECT COUNT(*) AS c FROM appointments WHERE agent_id = ?', [agentId]);
  const closed = (byStatus.find((r) => r.status === 'closed_won') || { c: 0 }).c;
  return ok(res, {
    totalLeads: total.c,
    appointments: appointments.c,
    closedWon: closed,
    byStatus: byStatus.reduce((a, r) => { a[r.status] = r.c; return a; }, {}),
  });
}

// ── Documents ───────────────────────────────────────────────────────────────
export async function handleDocuments(req, res, parts) {
  if (req.method === 'GET' && parts.length === 0) return listDocuments(req, res);
  if (req.method === 'POST' && parts.length === 0) return createDocument(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'templates') return listTemplates(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'generate') return generateDocument(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'generated') return listGenerated(req, res);
  if (req.method === 'DELETE' && parts.length === 1) return deleteDocument(req, res, parts[0]);
  return notFound(res, 'Documents route not found');
}

async function listDocuments(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const { page, limit, offset } = parsePagination(req.query || {});
  const rows = await all('SELECT * FROM documents WHERE owner_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [user.id, limit, offset]);
  const totalRow = await get('SELECT COUNT(*) AS c FROM documents WHERE owner_id = ?', [user.id]);
  return paginated(res, rows, totalRow.c, page, limit);
}

async function createDocument(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { name, type = 'other', propertyId, mimeType, size } = body;
  if (!name) return badRequest(res, 'Document name is required');
  const id = newId('doc');
  await run(
    `INSERT INTO documents (id, owner_id, property_id, name, type, storage_key, mime_type, size) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, user.id, propertyId || null, String(name), type, body.storageKey || null, mimeType || 'application/octet-stream', parseInt(size, 10) || 0]
  );
  return created(res, { message: 'Document saved', item: { id, name, type } });
}

async function deleteDocument(req, res, id) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const doc = await get('SELECT owner_id FROM documents WHERE id = ?', [id]);
  if (!doc) return notFound(res, 'Document not found');
  if (doc.owner_id !== user.id && user.role !== 'admin') return forbidden(res);
  await run('DELETE FROM documents WHERE id = ?', [id]);
  return ok(res, { message: 'Document deleted' });
}

async function listTemplates(req, res) {
  const rows = await all('SELECT * FROM document_templates ORDER BY name ASC');
  return ok(res, { items: rows.map((t) => ({ ...t, variables: safeJson(t.variables, []) })) });
}

const TEMPLATE_BODIES = {
  lease: (v) => `RESIDENTIAL LEASE AGREEMENT\n\nThis Agreement is made between ${v.landlord_name || '[Landlord]'} (the "Landlord") and ${v.tenant_name || '[Tenant]'} (the "Tenant") in respect of the property at ${v.property_address || '[Address]'}.\n\nTerm: ${v.start_date || '[Start]'} to ${v.end_date || '[End]'}.\nMonthly Rent: ₦${Number(v.monthly_rent || 0).toLocaleString()}\nSecurity Deposit: ₦${Number(v.deposit || 0).toLocaleString()}\n\nBoth parties agree to the terms governing peaceful enjoyment, maintenance obligations and notice periods consistent with the Tenancy Law of Lagos State.`,
  receipt: (v) => `RENT PAYMENT RECEIPT\n\nReceived from ${v.tenant_name || '[Tenant]'} the sum of ₦${Number(v.amount || 0).toLocaleString()} being payment of rent for ${v.property_address || '[Address]'} for the period ${v.period || '[Period]'}.\n\nDate: ${v.date || new Date().toISOString().slice(0, 10)}\n\nSigned: ____________________ (Landlord/Agent)`,
  notice: (v) => `NOTICE TO QUIT\n\nTo: ${v.tenant_name || '[Tenant]'}\nProperty: ${v.property_address || '[Address]'}\n\nYou are hereby given ${v.days || '[days]'} days\' notice to quit and deliver up vacant possession of the above premises in accordance with the applicable tenancy law.\n\nDate issued: ${v.notice_date || new Date().toISOString().slice(0, 10)}\n\nSigned: ____________________ (Landlord/Agent)`,
  contract: (v) => `DEED OF ASSIGNMENT\n\nThis Deed of Assignment is made between ${v.seller_name || '[Seller]'} (the "Assignor") and ${v.buyer_name || '[Buyer]'} (the "Assignee") in respect of the property at ${v.property_address || '[Address]'}.\n\nConsideration: ₦${Number(v.purchase_price || 0).toLocaleString()}\n\nUpon payment of the purchase price in full, the Assignor assigns all right, title and interest in the property to the Assignee, free from all encumbrances except as disclosed.\n\nDate: ${v.date || new Date().toISOString().slice(0, 10)}\n\nSigned: ____________________ (Assignor)\nSigned: ____________________ (Assignee)`,
  agreement: (v) => `OFFER TO LEASE\n\nTo: ${v.tenant_name || '[Tenant]'}\n\nThis letter constitutes an offer to lease the property at ${v.property_address || '[Address]'} on behalf of ${v.landlord_name || '[Landlord]'}, subject to the satisfactory execution of a formal lease agreement.\n\nProposed Monthly Rent: ₦${Number(v.monthly_rent || 0).toLocaleString()}\nProposed Commencement: ${v.start_date || '[Start]'}\n\nThis offer is open for acceptance for a period of 7 days from the date of issue.\n\nDate: ${new Date().toISOString().slice(0, 10)}\n\nSigned: ____________________ (Landlord/Agent)`,
};

async function generateDocument(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { templateId, title, variables = {} } = body;
  if (!templateId || !title) return badRequest(res, 'templateId and title are required');
  const template = await get('SELECT * FROM document_templates WHERE id = ?', [templateId]);
  if (!template) return notFound(res, 'Template not found');
  const fill = TEMPLATE_BODIES[template.type] || ((v) => `Document\n\n${JSON.stringify(v, null, 2)}`);
  const content = fill(variables);
  const id = newId('gnd');
  await run(
    `INSERT INTO generated_documents (id, template_id, owner_id, title, content, variables, status) VALUES (?, ?, ?, ?, ?, ?, 'generated')`,
    [id, template.id, user.id, String(title), content, JSON.stringify(variables)]
  );
  return created(res, { message: 'Document generated', item: { id, templateId, title, content, status: 'generated' } });
}

async function listGenerated(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all('SELECT id, template_id, title, variables, status, created_at FROM generated_documents WHERE owner_id = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, { items: rows.map((r) => ({ ...r, variables: safeJson(r.variables, {}) })) });
}

// ── Support tickets ─────────────────────────────────────────────────────────
export async function handleSupport(req, res, parts) {
  if (req.method === 'POST' && parts.length === 0) return createTicket(req, res);
  if (req.method === 'GET' && parts.length === 0) return listTickets(req, res);
  return notFound(res, 'Support route not found');
}

async function createTicket(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { subject, message, category = 'general', priority = 'medium' } = body;
  if (!subject || !message) return badRequest(res, 'subject and message are required');
  const id = newId('tkt');
  await run(
    `INSERT INTO support_tickets (id, user_id, subject, message, category, status, priority) VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    [id, user.id, String(subject), String(message), category, priority]
  );
  return created(res, { message: 'Ticket created. Our support team will respond shortly.', item: { id, status: 'open' } });
}

async function listTickets(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, { items: rows });
}

// ── Search & discovery extras ───────────────────────────────────────────────
export async function handleMisc(req, res, parts) {
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'favorites') return getFavorites(req, res);
  if (req.method === 'POST' && parts.length === 1 && parts[0] === 'saved-searches') return saveSearch(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'saved-searches') return listSearches(req, res);
  if (req.method === 'GET' && parts.length === 1 && parts[0] === 'meta') return meta(req, res);
  return notFound(res, 'Route not found');
}

async function saveSearch(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const body = parseJson(req) || {};
  const { name, filters } = body;
  if (!name) return badRequest(res, 'name is required');
  const id = newId('ss');
  await run('INSERT INTO saved_searches (id, user_id, name, filters) VALUES (?, ?, ?, ?)', [id, user.id, String(name), JSON.stringify(filters || {})]);
  return created(res, { message: 'Search saved', item: { id, name } });
}

async function listSearches(req, res) {
  const user = await currentUser(req);
  if (!user) return unauthorized(res);
  const rows = await all('SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC', [user.id]);
  return ok(res, { items: rows.map((r) => ({ ...r, filters: safeJson(r.filters, {}) })) });
}

async function meta(req, res) {
  const cities = await all('SELECT DISTINCT city FROM properties WHERE published = 1 ORDER BY city ASC');
  const states = await all('SELECT DISTINCT state FROM properties WHERE published = 1 ORDER BY state ASC');
  const types = await all('SELECT DISTINCT type FROM properties WHERE published = 1');
  return ok(res, {
    cities: cities.map((c) => c.city),
    states: states.map((s) => s.state),
    types: types.map((t) => t.type),
  });
}
