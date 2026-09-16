// Runtime-agnostic data layer.
//  - Node local dev  : better-sqlite3 (zero config, file-backed)
//  - Cloudflare      : D1 binding (same SQL — schema below is D1-compatible)
//
// Both adapters expose the same tiny query API used by every route:
//   all(sql, params), get(sql, params), run(sql, params), exec(sql), withTx(fn)
//
// Schema migrations are idempotent and run automatically on init (Node) or via
// `wrangler d1 execute` (Worker, see /workers/migrations).

import config from '../config.js';
import { randomHex } from '../lib/random.js';
import { hashPassword } from '../lib/password.js';

let mode = 'none'; // 'node' | 'd1'
let nodeDb = null; // better-sqlite3 Database instance
let d1Binding = null;

let lastMeta = { changes: 0, lastRowId: null };

export function getMode() {
  return mode;
}

export function getLastMeta() {
  return lastMeta;
}

export async function initNodeDatabase(dbPath = config.databasePath) {
  const [{ DatabaseSync }, fs, path] = await Promise.all([
    import('node:sqlite'),
    import('node:fs'),
    import('node:path'),
  ]);
  // `:memory:` and `file:` URIs are special-cased before path resolution.
  const isMemory = dbPath === ':memory:';
  const isFileUri = /^file:/.test(dbPath);
  const resolved = isMemory || isFileUri ? dbPath : path.resolve(dbPath);
  if (!isMemory && !isFileUri) {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
  }
  nodeDb = new DatabaseSync(resolved);
  nodeDb.exec('PRAGMA journal_mode = WAL;');
  nodeDb.exec('PRAGMA foreign_keys = ON;');
  mode = 'node';
  for (const stmt of SCHEMA_STATEMENTS) {
    nodeDb.exec(stmt);
  }
  // ensureSeed runs immediately after init (it is an async fn but uses the
  // synchronous node adapter internally through our all/get/run wrappers).
  await ensureSeed();
  // Upgrade tasks run on every boot and are idempotent.
  await upgradeSeed();
  return nodeDb;
}

export function initD1Database(d1) {
  d1Binding = d1;
  mode = 'd1';
  return d1;
}

function assertReady() {
  if (mode === 'node' && nodeDb) return;
  if (mode === 'd1' && d1Binding) return;
  throw new Error('Database not initialised');
}

export function all(sql, params = []) {
  assertReady();
  if (mode === 'node') {
    return nodeDb.prepare(sql).all(...params);
  }
  // D1 returns a promise
  return d1Binding
    .prepare(sql)
    .bind(...Array.isArray(params) ? params : [])
    .all()
    .then((r) => {
      lastMeta = { changes: r.meta?.changes ?? 0, lastRowId: r.meta?.last_row_id ?? null };
      return r.results ?? [];
    });
}

export function get(sql, params = []) {
  assertReady();
  if (mode === 'node') {
    return nodeDb.prepare(sql).get(...params);
  }
  return d1Binding
    .prepare(sql)
    .bind(...Array.isArray(params) ? params : [])
    .first?.()
    .then((row) => {
      return row ?? undefined;
    });
}

export function run(sql, params = []) {
  assertReady();
  if (mode === 'node') {
    const info = nodeDb.prepare(sql).run(...params);
    lastMeta = {
      changes: info.changes,
      lastRowId: info.lastInsertRowid ?? info.lastInsertRowid ?? null,
    };
    return info;
  }
  return d1Binding
    .prepare(sql)
    .bind(...Array.isArray(params) ? params : [])
    .run()
    .then((r) => {
      lastMeta = {
        changes: r.meta?.changes ?? 0,
        lastRowId: r.meta?.last_row_id ?? null,
      };
      return r;
    });
}

export function exec(sql) {
  assertReady();
  if (mode === 'node') {
    nodeDb.exec(sql);
    return;
  }
  return d1Binding.exec(sql);
}

// Transactions: real on SQLite (BEGIN/COMMIT/ROLLBACK); sequential on D1.
export async function withTx(fn) {
  assertReady();
  if (mode === 'node') {
    nodeDb.exec('BEGIN');
    try {
      const result = await fn();
      nodeDb.exec('COMMIT');
      return result;
    } catch (err) {
      nodeDb.exec('ROLLBACK');
      throw err;
    }
  }
  return fn();
}

export const now = () => new Date().toISOString();

export const newId = (prefix = 'id') => `${prefix}_${randomHex(10)}`;

// ─────────────────────────────────────────────────────────────────────────────
// Schema (D1-compatible SQLite dialect)
// ─────────────────────────────────────────────────────────────────────────────
export const SCHEMA_STATEMENTS = [
  // Users & auth
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'tenant',
    verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    verification_expires TEXT,
    reset_token TEXT,
    reset_expires TEXT,
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    company TEXT,
    occupation TEXT,
    trust_score INTEGER NOT NULL DEFAULT 0,
    verified_status TEXT NOT NULL DEFAULT 'unverified',
    id_document_url TEXT,
    preferences TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Properties & discovery
  `CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    landlord_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'apartment',
    price INTEGER NOT NULL DEFAULT 0,
    price_period TEXT NOT NULL DEFAULT 'month',
    status TEXT NOT NULL DEFAULT 'available',
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT 'NG',
    latitude REAL,
    longitude REAL,
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms REAL NOT NULL DEFAULT 0,
    area_sqm INTEGER NOT NULL DEFAULT 0,
    year_built INTEGER,
    amenities TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    available_from TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    PRIMARY KEY (user_id, property_id)
  )`,

  `CREATE TABLE IF NOT EXISTS property_views (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filters TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Bookings, payments
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    landlord_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_rent INTEGER NOT NULL DEFAULT 0,
    security_deposit INTEGER NOT NULL DEFAULT 0,
    fee INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
    reference TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    description TEXT,
    type TEXT NOT NULL DEFAULT 'booking',
    status TEXT NOT NULL DEFAULT 'pending',
    channel TEXT NOT NULL DEFAULT 'simulation',
    paystack_ref TEXT,
    test_mode INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    paid_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS paystack_events (
    id TEXT PRIMARY KEY,
    reference TEXT,
    event TEXT,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Maintenance & vendors
  `CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'other',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    images TEXT NOT NULL DEFAULT '[]',
    assigned_to TEXT,
    estimated_cost INTEGER,
    actual_cost INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    resolved_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    business_name TEXT,
    description TEXT NOT NULL DEFAULT '',
    services TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL DEFAULT 'general',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    license_number TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS vendor_services (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    price INTEGER NOT NULL DEFAULT 0,
    duration_min INTEGER NOT NULL DEFAULT 60,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS service_bookings (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    service_id TEXT REFERENCES vendor_services(id) ON DELETE SET NULL,
    client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    total_price INTEGER NOT NULL DEFAULT 0,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Messaging & notifications
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id TEXT,
    last_message TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Agent CRM
  `CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number TEXT,
    brokerage TEXT,
    specialization TEXT NOT NULL DEFAULT '[]',
    experience_years INTEGER NOT NULL DEFAULT 0,
    rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    verified INTEGER NOT NULL DEFAULT 0,
    commission_rate REAL NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT NOT NULL DEFAULT 'website',
    status TEXT NOT NULL DEFAULT 'new',
    priority TEXT NOT NULL DEFAULT 'medium',
    property_id TEXT,
    budget_min INTEGER,
    budget_max INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
    property_id TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Documents & leases
  `CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    storage_key TEXT,
    mime_type TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS document_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    variables TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS generated_documents (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES document_templates(id) ON DELETE SET NULL,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    variables TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS leases (
    id TEXT PRIMARY KEY,
    booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    landlord_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    monthly_rent INTEGER NOT NULL DEFAULT 0,
    deposit INTEGER NOT NULL DEFAULT 0,
    terms TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Insurance
  `CREATE TABLE IF NOT EXISTS insurance_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    logo_url TEXT,
    coverage_types TEXT NOT NULL DEFAULT '[]',
    rating REAL NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS insurance_quotes (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
    property_id TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coverage_type TEXT NOT NULL DEFAULT 'Property',
    coverage_amount INTEGER NOT NULL DEFAULT 0,
    premium INTEGER NOT NULL DEFAULT 0,
    deductible INTEGER NOT NULL DEFAULT 0,
    term_months INTEGER NOT NULL DEFAULT 12,
    status TEXT NOT NULL DEFAULT 'active',
    valid_until TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS insurance_policies (
    id TEXT PRIMARY KEY,
    quote_id TEXT REFERENCES insurance_quotes(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
    property_id TEXT,
    policy_number TEXT,
    coverage_amount INTEGER NOT NULL DEFAULT 0,
    premium INTEGER NOT NULL DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS insurance_claims (
    id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claim_type TEXT NOT NULL DEFAULT 'other',
    description TEXT NOT NULL DEFAULT '',
    incident_date TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    claim_amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Mortgage / financials
  `CREATE TABLE IF NOT EXISTS mortgage_rates (
    id TEXT PRIMARY KEY,
    lender TEXT NOT NULL,
    rate REAL NOT NULL DEFAULT 0,
    apr REAL NOT NULL DEFAULT 0,
    points REAL NOT NULL DEFAULT 0,
    fees INTEGER NOT NULL DEFAULT 0,
    term_years INTEGER NOT NULL DEFAULT 30,
    last_updated TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Roommate matching
  `CREATE TABLE IF NOT EXISTS room_listings (
    id TEXT PRIMARY KEY,
    landlord_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    rent INTEGER NOT NULL DEFAULT 0,
    available_from TEXT,
    roommates_needed INTEGER NOT NULL DEFAULT 1,
    current_roommates INTEGER NOT NULL DEFAULT 1,
    preferences TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS roommate_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age INTEGER,
    occupation TEXT,
    budget_min INTEGER NOT NULL DEFAULT 0,
    budget_max INTEGER NOT NULL DEFAULT 0,
    preferences TEXT NOT NULL DEFAULT '{}',
    bio TEXT NOT NULL DEFAULT '',
    verified INTEGER NOT NULL DEFAULT 0,
    background_check INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS roommate_applications (
    id TEXT PRIMARY KEY,
    room_listing_id TEXT NOT NULL REFERENCES room_listings(id) ON DELETE CASCADE,
    applicant_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS room_matches (
    id TEXT PRIMARY KEY,
    room_listing_id TEXT NOT NULL REFERENCES room_listings(id) ON DELETE CASCADE,
    user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'suggested',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Auctions
  `CREATE TABLE IF NOT EXISTS auctions (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    starting_price INTEGER NOT NULL DEFAULT 0,
    reserve_price INTEGER NOT NULL DEFAULT 0,
    bid_increment INTEGER NOT NULL DEFAULT 50000,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS auction_bids (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Valuation, inspections, neighborhoods
  `CREATE TABLE IF NOT EXISTS valuation_reports (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    avm_value INTEGER NOT NULL DEFAULT 0,
    confidence_score INTEGER NOT NULL DEFAULT 0,
    methodology TEXT NOT NULL DEFAULT 'avm',
    factors TEXT NOT NULL DEFAULT '[]',
    comparables TEXT NOT NULL DEFAULT '[]',
    price_range TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS inspection_reports (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    inspector_name TEXT,
    scheduled_date TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    checklist TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '',
    photos TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS valuation_disputes (
    id TEXT PRIMARY KEY,
    valuation_id TEXT,
    property_id TEXT,
    client_id TEXT,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'under_review',
    resolution TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS neighborhoods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    walk_score INTEGER NOT NULL DEFAULT 0,
    transit_score INTEGER NOT NULL DEFAULT 0,
    safety_score INTEGER NOT NULL DEFAULT 0,
    school_score INTEGER NOT NULL DEFAULT 0,
    amenities_score INTEGER NOT NULL DEFAULT 0,
    overall_score INTEGER NOT NULL DEFAULT 0,
    amenities TEXT NOT NULL DEFAULT '[]',
    price_trend TEXT NOT NULL DEFAULT 'stable',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  // Platform ops
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,

  `CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT 'true',
    description TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
];

function jsonField(value) {
  return JSON.stringify(value ?? []);
}

export async function ensureSeed(force = false) {
  const existing = await get(`SELECT COUNT(*) AS c FROM users`);
  if (!force && existing && existing.c > 0) return;

  // NOTE: seed only populates empty tables (idempotent upserts excluded) so it
  // is safe to re-run.
  const password = await hashPassword('Password123!');

  const users = [
    { id: 'usr_admin', name: 'Ada Admin', email: 'admin@agently.ng', role: 'admin', verified: 1 },
    { id: 'usr_landlord1', name: 'Chiamaka Okafor', email: 'landlord@agently.ng', role: 'landlord', verified: 1, phone: '+2348012345601' },
    { id: 'usr_landlord2', name: 'Ibrahim Musa', email: 'landlord2@agently.ng', role: 'landlord', verified: 1, phone: '+2348012345602' },
    { id: 'usr_agent1', name: 'David Adeyemi', email: 'agent@agently.ng', role: 'agent', verified: 1, phone: '+2348012345603' },
    { id: 'usr_tenant1', name: 'Amara Eze', email: 'tenant@agently.ng', role: 'tenant', verified: 1, phone: '+2348012345604' },
    { id: 'usr_tenant2', name: 'Tunde Bakare', email: 'tenant2@agently.ng', role: 'tenant', verified: 1, phone: '+2348012345605' },
    { id: 'usr_manager1', name: 'Ngozi Nwosu', email: 'manager@agently.ng', role: 'manager', verified: 1, phone: '+2348012345606' },
  ];

  for (const u of users) {
    const exists = await get(`SELECT id FROM users WHERE id = ?`, [u.id]);
    if (exists) continue;
    await run(
      `INSERT INTO users (id, name, email, password_hash, role, verified, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [u.id, u.name, u.email, password, u.role, u.verified ?? 0, u.phone ?? null]
    );
  }

  const profs = [
    { user_id: 'usr_landlord1', bio: 'Property investor & landlord in Lagos and Abuja.', company: 'Okafor Estates', trust_score: 92, verified_status: 'verified' },
    { user_id: 'usr_landlord2', bio: 'Managing a portfolio of residential units across South-West Nigeria.', company: 'Musa Homes', trust_score: 88, verified_status: 'verified' },
    { user_id: 'usr_agent1', bio: 'Licensed realtor focused on Lekki & Ikoyi.', company: 'Adeyemi Realty', trust_score: 95, verified_status: 'verified' },
    { user_id: 'usr_tenant1', bio: 'Young professional looking for a modern apartment.', occupation: 'Product Designer', trust_score: 74, verified_status: 'verified' },
    { user_id: 'usr_tenant2', bio: 'Graduate student & part-time developer.', occupation: 'Software Engineer', trust_score: 70, verified_status: 'verified' },
  ];
  for (const p of profs) {
    const exists = await get(`SELECT user_id FROM profiles WHERE user_id = ?`, [p.user_id]);
    if (exists) continue;
    await run(
      `INSERT INTO profiles (user_id, bio, company, occupation, trust_score, verified_status) VALUES (?, ?, ?, ?, ?, ?)`,
      [p.user_id, p.bio, p.company ?? null, p.occupation ?? null, p.trust_score, p.verified_status]
    );
  }

  const properties = [
    {
      id: 'prp_lekki_duplex', landlord_id: 'usr_landlord1', title: 'Modern 3-Bedroom Duplex in Lekki Phase 1',
      description: 'A tastefully finished 3-bedroom duplex with a private garden, 24/7 power, borehole water and estate security. Minutes from Admiralty Way.',
      type: 'apartment', price: 650000, status: 'available', address: '12 Admiralty Way', city: 'Lekki', state: 'Lagos', country: 'NG',
      latitude: 6.4478, longitude: 3.4723, bedrooms: 3, bathrooms: 3, area_sqm: 240, year_built: 2021,
      amenities: ['24/7 Power', 'Borehole', 'Security', 'Parking', 'WiFi', 'Garden'], featured: 1,
      images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80'],
    },
    {
      id: 'prp_yaba_flat', landlord_id: 'usr_landlord2', title: 'Newly Renovated 2-Bedroom Flat in Yaba',
      description: 'Bright 2-bedroom flat close to the Yaba tech district and universities. Tiled throughout with fitted kitchen and prepaid meter.',
      type: 'apartment', price: 450000, status: 'available', address: '8 Herbert Macaulay Way', city: 'Yaba', state: 'Lagos', country: 'NG',
      latitude: 6.5095, longitude: 3.3711, bedrooms: 2, bathrooms: 2, area_sqm: 140, year_built: 2019,
      amenities: ['Fitted Kitchen', 'Prepaid Meter', 'Security', 'Parking', 'Water Heater'], featured: 1,
      images: ['https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&q=80', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80'],
    },
    {
      id: 'prp_ikeja_duplex', landlord_id: 'usr_landlord1', title: 'Executive 4-Bedroom Duplex in Ikeja GRA',
      description: 'Spacious executive duplex in a serene GRA with ample parking, a landscaped compound and home office space.',
      type: 'house', price: 1200000, status: 'available', address: '3 Joel Ogunnaike Street', city: 'Ikeja', state: 'Lagos', country: 'NG',
      latitude: 6.6156, longitude: 3.3684, bedrooms: 4, bathrooms: 4, area_sqm: 380, year_built: 2020,
      amenities: ['Home Office', 'Garden', 'Security', 'Generator', 'Parking', 'Staff Quarters'], featured: 0,
      images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80'],
    },
    {
      id: 'prp_vi_serviced', landlord_id: 'usr_landlord2', title: 'Serviced 1-Bedroom Apartment in Victoria Island',
      description: 'Fully serviced short-let style apartment with cleaning, DSTV and 24/7 power. Ideal for expatriates and professionals.',
      type: 'apartment', price: 900000, status: 'available', address: '22 Adeola Odeku Street', city: 'Victoria Island', state: 'Lagos', country: 'NG',
      latitude: 6.4281, longitude: 3.4219, bedrooms: 1, bathrooms: 1, area_sqm: 95, year_built: 2022,
      amenities: ['Cleaning Service', 'DSTV', '24/7 Power', 'Pool', 'Gym', 'Elevator'], featured: 1,
      images: ['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80'],
    },
    {
      id: 'prp_surulere_flat', landlord_id: 'usr_landlord1', title: 'Cozy 2-Bedroom Flat in Surulere',
      description: 'Affordable and well-located 2-bedroom flat near the National Stadium with easy access to the mainland and island.',
      type: 'apartment', price: 350000, status: 'available', address: '15 Adeniran Ogunsanya', city: 'Surulere', state: 'Lagos', country: 'NG',
      latitude: 6.5044, longitude: 3.3524, bedrooms: 2, bathrooms: 2, area_sqm: 110, year_built: 2018,
      amenities: ['Parking', 'Security', 'Water', 'Tiled Floors'], featured: 0,
      images: ['https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=1200&q=80', 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=1200&q=80'],
    },
    {
      id: 'prp_ikoyi_mansion', landlord_id: 'usr_landlord2', title: 'Luxury 4-Bedroom Detached House in Ikoyi',
      description: 'A landmark residence in old Ikoyi with a private pool, guest house and manicured grounds behind high security walls.',
      type: 'house', price: 2500000, status: 'available', address: '5 Glover Road', city: 'Ikoyi', state: 'Lagos', country: 'NG',
      latitude: 6.4500, longitude: 3.4333, bedrooms: 4, bathrooms: 5, area_sqm: 520, year_built: 2017,
      amenities: ['Private Pool', 'Guest House', 'Security', 'Generator', 'Garden', 'CCTV'], featured: 0,
      images: ['https://images.unsplash.com/photo-1600607688066-890987f18a86?w=1200&q=80', 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=80'],
    },
    {
      id: 'prp_abuja_apartment', landlord_id: 'usr_landlord1', title: '3-Bedroom Apartment in Wuse 2, Abuja',
      description: 'Modern 3-bedroom apartment in the heart of Wuse 2, close to embassies, restaurants and government offices.',
      type: 'apartment', price: 850000, status: 'available', address: '9 Aminu Kano Crescent', city: 'Wuse 2', state: 'FCT Abuja', country: 'NG',
      latitude: 9.0765, longitude: 7.3986, bedrooms: 3, bathrooms: 3, area_sqm: 200, year_built: 2021,
      amenities: ['24/7 Power', 'Security', 'Parking', 'Elevator', 'Gym'], featured: 1,
      images: ['https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&q=80', 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=1200&q=80'],
    },
    {
      id: 'prp_ph_flat', landlord_id: 'usr_landlord2', title: '3-Bedroom Flat in GRA Port Harcourt',
      description: 'Contemporary 3-bedroom flat in the GRA with ample parking, water treatment and a quiet neighbourhood.',
      type: 'apartment', price: 600000, status: 'available', address: '11 Forces Avenue', city: 'Port Harcourt', state: 'Rivers', country: 'NG',
      latitude: 4.8156, longitude: 7.0498, bedrooms: 3, bathrooms: 3, area_sqm: 185, year_built: 2020,
      amenities: ['Water Treatment', 'Security', 'Parking', 'Prepaid Meter', 'Generator'], featured: 0,
      images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80', 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&q=80'],
    },
  ];

  for (const p of properties) {
    const exists = await get(`SELECT id FROM properties WHERE id = ?`, [p.id]);
    if (exists) continue;
    await run(
      `INSERT INTO properties (
        id, landlord_id, title, description, type, price, price_period, status,
        address, city, state, country, latitude, longitude,
        bedrooms, bathrooms, area_sqm, year_built, amenities, images, featured, available_from
      ) VALUES (?, ?, ?, ?, ?, ?, 'month', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.id, p.landlord_id, p.title, p.description, p.type, p.price, p.status,
        p.address, p.city, p.state, p.country, p.latitude, p.longitude,
        p.bedrooms, p.bathrooms, p.area_sqm, p.year_built,
        jsonField(p.amenities), jsonField(p.images), p.featured, '2026-01-01',
      ]
    );
  }

  // Agent + leads
  const agentExists = await get(`SELECT id FROM agents WHERE user_id = ?`, ['usr_agent1']);
  if (!agentExists) {
    await run(
      `INSERT INTO agents (id, user_id, license_number, brokerage, specialization, experience_years, rating, review_count, verified, commission_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['agt_1', 'usr_agent1', 'LRE/2024/0012', 'Adeyemi Realty', jsonField(['Residential', 'Luxury', 'Commercial']), 8, 4.8, 127, 1, 3.0]
    );
  }
  const leadCount = await get(`SELECT COUNT(*) AS c FROM leads`);
  if (leadCount.c === 0) {
    await run(
      `INSERT INTO leads (id, agent_id, first_name, last_name, email, phone, source, status, priority, property_id, budget_min, budget_max, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ld_1', 'agt_1', 'Femi', 'Adeleke', 'femi@example.com', '+2348011112222', 'website', 'qualified', 'high', 'prp_lekki_duplex', 500000, 800000, 'Looking for a 3-bed in Lekki with 24/7 power.']
    );
    await run(
      `INSERT INTO leads (id, agent_id, first_name, last_name, email, phone, source, status, priority, property_id, budget_min, budget_max, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['ld_2', 'agt_1', 'Kemi', 'Alabi', 'kemi@example.com', '+2348022223333', 'referral', 'new', 'medium', null, 300000, 450000, 'Referred by an existing client. Prefers Yaba or Surulere.']
    );
  }

  // Vendors + services
  const vendorCount = await get(`SELECT COUNT(*) AS c FROM vendors`);
  if (vendorCount.c === 0) {
    const vendors = [
      { id: 'vnd_1', name: 'QuickFix Plumbing', email: 'hello@quickfix.ng', phone: '+2348030001100', business_name: 'QuickFix Plumbing Ltd', description: 'Certified plumbers for repairs, installations and emergency call-outs across Lagos.', services: jsonField(['Plumbing Repair', 'Installation', 'Emergency']), category: 'plumbing', city: 'Lagos', state: 'Lagos', rating: 4.6, review_count: 84, verified: 1, license_number: 'LG-2023-PL-0192' },
      { id: 'vnd_2', name: 'Spark Electric', email: 'jobs@sparkelectric.ng', phone: '+2348054445566', business_name: 'Spark Electric Services', description: 'NEMSA-certified electrical contractors for wiring, rewiring and maintenance.', services: jsonField(['Wiring', 'Rewiring', 'Audit']), category: 'electrical', city: 'Lagos', state: 'Lagos', rating: 4.8, review_count: 63, verified: 1, license_number: 'NEMSA-8841' },
      { id: 'vnd_3', name: 'PrimeClean Co', email: 'book@primeclean.ng', phone: '+2348097778899', business_name: 'PrimeClean Company', description: 'Deep cleaning and post-tenancy cleaning services with insured, vetted staff.', services: jsonField(['Deep Clean', 'Post-Tenancy', 'Office']), category: 'cleaning', city: 'Abuja', state: 'FCT Abuja', rating: 4.7, review_count: 141, verified: 1, license_number: 'ABJ-CLN-2210' },
    ];
    for (const v of vendors) {
      await run(
        `INSERT INTO vendors (id, name, email, phone, business_name, description, services, category, city, state, rating, review_count, verified, license_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [v.id, v.name, v.email, v.phone, v.business_name, v.description, v.services, v.category, v.city, v.state, v.rating, v.review_count, v.verified, v.license_number]
      );
    }
    const services = [
      { id: 'vsv_1', vendor_id: 'vnd_1', name: 'Leak & Pipe Repair', description: 'Diagnose and repair leaking pipes, faucets and fittings.', category: 'Plumbing', price: 25000, duration_min: 90 },
      { id: 'vsv_2', vendor_id: 'vnd_1', name: 'Water Heater Installation', description: 'Supply and install electric water heaters.', category: 'Plumbing', price: 85000, duration_min: 120 },
      { id: 'vsv_3', vendor_id: 'vnd_2', name: 'Full House Wiring', description: 'Complete wiring for a standard 2-bedroom apartment.', category: 'Electrical', price: 180000, duration_min: 480 },
      { id: 'vsv_4', vendor_id: 'vnd_2', name: 'Electrical Audit', description: 'Safety audit with report and recommendations.', category: 'Electrical', price: 40000, duration_min: 60 },
      { id: 'vsv_5', vendor_id: 'vnd_3', name: 'Post-Tenancy Deep Clean', description: 'End-to-end deep cleaning before a new tenant moves in.', category: 'Cleaning', price: 60000, duration_min: 300 },
    ];
    for (const s of services) {
      await run(
        `INSERT INTO vendor_services (id, vendor_id, name, description, category, price, duration_min) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [s.id, s.vendor_id, s.name, s.description, s.category, s.price, s.duration_min]
      );
    }
  }

  // Insurance
  const insCount = await get(`SELECT COUNT(*) AS c FROM insurance_providers`);
  if (insCount.c === 0) {
    const insurers = [
      { id: 'ins_1', name: 'Leadway Assurance', description: 'Home and landlord insurance with nationwide claims support.', coverage_types: jsonField(['Property', 'Liability', 'Fire', 'Flood']), rating: 4.6, review_count: 320 },
      { id: 'ins_2', name: 'AXA Mansard', description: 'Flexible home insurance plans with emergency assistance.', coverage_types: jsonField(['Property', 'Liability', 'Theft']), rating: 4.5, review_count: 210 },
      { id: 'ins_3', name: 'AIICO Insurance', description: 'Affordable renters and property coverage for homes.', coverage_types: jsonField(['Property', 'Fire', 'Flood', 'Theft']), rating: 4.4, review_count: 175 },
    ];
    for (const i of insurers) {
      await run(
        `INSERT INTO insurance_providers (id, name, description, coverage_types, rating, review_count) VALUES (?, ?, ?, ?, ?, ?)`,
        [i.id, i.name, i.description, i.coverage_types, i.rating, i.review_count]
      );
    }
  }

  // Mortgage rates
  const rateCount = await get(`SELECT COUNT(*) AS c FROM mortgage_rates`);
  if (rateCount.c === 0) {
    const rates = [
      { id: 'mrt_1', lender: 'First Bank Nigeria', rate: 21.5, apr: 22.1, points: 1.0, fees: 150000, term_years: 20 },
      { id: 'mrt_2', lender: 'GTBank', rate: 20.0, apr: 20.6, points: 0.5, fees: 120000, term_years: 15 },
      { id: 'mrt_3', lender: 'Stanbic IBTC', rate: 19.5, apr: 20.0, points: 0.5, fees: 135000, term_years: 25 },
    ];
    for (const r of rates) {
      await run(
        `INSERT INTO mortgage_rates (id, lender, rate, apr, points, fees, term_years) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.lender, r.rate, r.apr, r.points, r.fees, r.term_years]
      );
    }
  }

  // Roommate matching
  const roomCount = await get(`SELECT COUNT(*) AS c FROM room_listings`);
  if (roomCount.c === 0) {
    await run(
      `INSERT INTO room_listings (id, landlord_id, property_id, title, description, rent, available_from, roommates_needed, current_roommates, preferences)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['rm_1', 'usr_landlord1', 'prp_yaba_flat', 'Ensuite room in Yaba 2-bedroom flat', 'Private room with own bathroom in a shared 2-bed flat close to the tech district.', 180000, '2026-02-01', 1, 1, jsonField({ gender: 'any', ageRange: [22, 32], smoking: false, pets: false })]
    );
  }
  const rpCount = await get(`SELECT COUNT(*) AS c FROM roommate_profiles`);
  if (rpCount.c === 0) {
    await run(
      `INSERT INTO roommate_profiles (id, user_id, age, occupation, budget_min, budget_max, preferences, bio, verified, background_check)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['rp_1', 'usr_tenant2', 27, 'Software Engineer', 120000, 250000, jsonField({ smoking: false, pets: false, nightOwl: true, cleanliness: 4, socialLevel: 3 }), 'Clean, quiet professional. Prefers a shared flat near Yaba.', 1, 1]
    );
  }

  // Neighborhoods
  const nCount = await get(`SELECT COUNT(*) AS c FROM neighborhoods`);
  if (nCount.c === 0) {
    const hoods = [
      { id: 'nh_lekki', name: 'Lekki Phase 1', city: 'Lekki', state: 'Lagos', description: 'Upscale residential and commercial district along the Lekki corridor.', walk_score: 72, transit_score: 68, safety_score: 78, school_score: 80, amenities_score: 88, overall_score: 81, amenities: jsonField(['Restaurants', 'Malls', 'Gyms', 'Beach', 'Schools']), price_trend: 'up' },
      { id: 'nh_yaba', name: 'Yaba', city: 'Yaba', state: 'Lagos', description: 'Vibrant tech and education hub with growing rental demand.', walk_score: 84, transit_score: 82, safety_score: 66, school_score: 86, amenities_score: 80, overall_score: 79, amenities: jsonField(['Tech Hubs', 'Universities', 'Markets', 'Buses']), price_trend: 'up' },
      { id: 'nh_ikeja', name: 'Ikeja GRA', city: 'Ikeja', state: 'Lagos', description: 'Serene, tree-lined government reserve area on the mainland.', walk_score: 62, transit_score: 60, safety_score: 88, school_score: 74, amenities_score: 70, overall_score: 78, amenities: jsonField(['Parks', 'Restaurants', 'Schools', 'Clubs']), price_trend: 'stable' },
    ];
    for (const h of hoods) {
      await run(
        `INSERT INTO neighborhoods (id, name, city, state, description, walk_score, transit_score, safety_score, school_score, amenities_score, overall_score, amenities, price_trend)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [h.id, h.name, h.city, h.state, h.description, h.walk_score, h.transit_score, h.safety_score, h.school_score, h.amenities_score, h.overall_score, h.amenities, h.price_trend]
      );
    }
  }

  // Feature flags
  const ffCount = await get(`SELECT COUNT(*) AS c FROM feature_flags`);
  if (ffCount.c === 0) {
    await run(`INSERT INTO feature_flags (key, value, description) VALUES ('payments', 'true', 'Enable booking payments')`);
    await run(`INSERT INTO feature_flags (key, value, description) VALUES ('maintenance_mode', 'false', 'Put the platform into read-only maintenance mode')`);
  }

  // Bookings sample — tenant1 has a confirmed tenancy (happy path for
  // maintenance + tenant portal), tenant2 has none yet.
  const bkCount = await get(`SELECT COUNT(*) AS c FROM bookings`);
  if (bkCount.c === 0) {
    await run(
      `INSERT INTO bookings (id, property_id, tenant_id, landlord_id, start_date, end_date, monthly_rent, security_deposit, fee, status, payment_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['bk_1', 'prp_surulere_flat', 'usr_tenant1', 'usr_landlord1', '2026-03-01', '2027-02-28', 350000, 350000, 0, 'confirmed', 'paid', 'Active tenancy — moved in March 2026.']
    );
    await run(`UPDATE properties SET status = 'occupied' WHERE id = 'prp_surulere_flat'`);
  }

  // Maintenance sample
  const mtCount = await get(`SELECT COUNT(*) AS c FROM maintenance_requests`);
  if (mtCount.c === 0) {
    await run(
      `INSERT INTO maintenance_requests (id, property_id, tenant_id, title, description, category, priority, status, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['mnt_1', 'prp_lekki_duplex', 'usr_tenant1', 'Kitchen sink leaking', 'The kitchen sink has been dripping continuously for two days.', 'plumbing', 'medium', 'pending', '[]']
    );
  }

  // Welcome notification
  const ntCount = await get(`SELECT COUNT(*) AS c FROM notifications`);
  if (ntCount.c === 0) {
    await run(
      `INSERT INTO notifications (id, user_id, type, title, body, link, read)
       VALUES (?, ?, 'welcome', 'Welcome to Agently', 'Your trusted home-renting journey starts here. Complete your profile to unlock verified badges.', '/dashboard', 0)`,
      ['ntf_1', 'usr_tenant1']
    );
  }

  console.log('[db] seed complete');
}

// Idempotent upgrades applied on every boot after ensureSeed.
export async function upgradeSeed() {
  const templates = [
    { id: 'dtm_lease', name: 'Residential Lease Agreement (Nigeria)', type: 'lease', description: 'Standard residential tenancy agreement with variable substitution.', variables: jsonField(['landlord_name', 'tenant_name', 'property_address', 'monthly_rent', 'deposit', 'start_date', 'end_date']) },
    { id: 'dtm_receipt', name: 'Rent Payment Receipt', type: 'receipt', description: 'Receipt of rent payment for a given period.', variables: jsonField(['tenant_name', 'property_address', 'amount', 'period', 'date']) },
    { id: 'dtm_notice', name: 'Notice to Quit', type: 'notice', description: 'Formal notice to a tenant in line with Nigerian tenancy law.', variables: jsonField(['tenant_name', 'property_address', 'notice_date', 'days']) },
    { id: 'dtm_tenancy', name: 'Tenancy Agreement (Standard)', type: 'lease', description: 'Full two-party tenancy agreement with rent, deposit and term.', variables: jsonField(['landlord_name', 'tenant_name', 'property_address', 'monthly_rent', 'deposit', 'start_date', 'end_date']) },
    { id: 'dtm_sale', name: 'Deed of Assignment (Sale)', type: 'contract', description: 'Deed of assignment for a completed property sale in Nigeria.', variables: jsonField(['seller_name', 'buyer_name', 'property_address', 'purchase_price', 'date']) },
    { id: 'dtm_offer', name: 'Offer to Lease', type: 'agreement', description: 'Letter outlining the key commercial terms before a formal lease.', variables: jsonField(['landlord_name', 'tenant_name', 'property_address', 'monthly_rent', 'start_date']) },
    { id: 'dtm_eviction', name: 'Notice to Quit (Formal)', type: 'notice', description: 'Statutory notice in line with recovery of premises law.', variables: jsonField(['tenant_name', 'property_address', 'notice_date', 'days']) },
  ];
  for (const t of templates) {
    await run(
      `INSERT OR IGNORE INTO document_templates (id, name, type, description, content, variables) VALUES (?, ?, ?, ?, ?, ?)`,
      [t.id, t.name, t.type, t.description, '', t.variables]
    );
  }
}
