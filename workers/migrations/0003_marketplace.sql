-- ---------------------------------------------------------------------------
-- 0003_marketplace.sql — catalog & marketplace tables for the frontend market.
-- Persists vendor directory, insurance providers, auctions, neighborhood
-- insights, roommate listings, and agent CRM data so every feature journey
-- runs against real D1 storage rather than in-memory fallbacks.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vendor_directory (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  description TEXT,
  services TEXT DEFAULT '[]',
  city TEXT,
  state TEXT,
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS insurance_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  coverage_types TEXT DEFAULT '[]',
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auctions (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  starting_price REAL DEFAULT 0,
  current_bid REAL DEFAULT 0,
  reserve_price REAL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'draft',
  total_bids INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auction_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL,
  bidder_id TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS property_valuations (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  user_id TEXT,
  estimated_value REAL,
  confidence REAL DEFAULT 0,
  report TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS neighborhood_insights (
  id TEXT PRIMARY KEY,
  neighborhood_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  safety_score REAL DEFAULT 0,
  walkability_score REAL DEFAULT 0,
  school_rating REAL DEFAULT 0,
  overview TEXT,
  amenities TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roommate_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  budget_min REAL DEFAULT 0,
  budget_max REAL DEFAULT 0,
  move_in_date TEXT,
  lifestyle TEXT DEFAULT '[]',
  preferences TEXT DEFAULT '[]',
  bio TEXT,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roommate_availabilities (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  property_id TEXT,
  room_description TEXT,
  price REAL DEFAULT 0,
  available_from TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roommate_applications (
  id TEXT PRIMARY KEY,
  room_availability_id TEXT,
  applicant_id TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT,
  license_number TEXT,
  brokerage TEXT,
  rating REAL DEFAULT 0,
  experience_years INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_appointments (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  client_id TEXT,
  property_id TEXT,
  starts_at TEXT,
  note TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_rating ON vendor_directory (rating DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions (status);
CREATE INDEX IF NOT EXISTS idx_neighborhood_name ON neighborhood_insights (neighborhood_name);
CREATE INDEX IF NOT EXISTS idx_roommate_budget ON roommate_profiles (budget_min, budget_max);

-- Seed the marketplace so every journey resolves immediately (idempotent).
INSERT OR IGNORE INTO insurance_providers (id, name, coverage_types, rating, review_count) VALUES
  ('src-ins-1', 'SafeHome Insurance', '["Property","Liability","Flood"]', 4.6, 1250),
  ('src-ins-2', 'HavenSure', '["Property","Renters","Liability"]', 4.7, 986);

INSERT OR IGNORE INTO agent_profiles (id, name, email, license_number, brokerage, rating, experience_years, verified) VALUES
  ('src-agent-1', 'Rae Agent', 'agent@agently.dev', 'CA-DRE-1234', 'Agently Brokers', 4.8, 8, 1);

INSERT OR IGNORE INTO vendor_directory (id, name, business_name, email, phone, description, services, city, state, rating, review_count, verified) VALUES
  ('src-vendor-1', 'John Plumbing', 'John''s Plumbing Services', 'john@agently.dev', '(555) 100-2000',
   'Residential & commercial plumbing for two decades.',
   '["Plumbing Repair","Installation","Maintenance"]', 'San Francisco', 'CA', 4.7, 231, 1),
  ('src-vendor-2', 'Volt Electric', 'Volt Electric Co.', 'volt@agently.dev', '(555) 100-2001',
   'Licensed electrical contracting and smart-home wiring.',
   '["Wiring","Panel Upgrades","Smart Home"]', 'New York', 'NY', 4.8, 180, 1);

INSERT OR IGNORE INTO auctions (id, property_id, title, description, starting_price, current_bid, reserve_price, start_date, end_date, status, total_bids, watchers) VALUES
  ('src-auction-1', 'seed-prop-2', 'Vela High-Rise Condo — Bank Sale',
   'Prime condo auction',
   320000, 348000, 330000,
   datetime('now'), datetime('now', '+7 days'), 'active', 23, 156);

INSERT OR IGNORE INTO neighborhood_insights (id, neighborhood_name, city, state, safety_score, walkability_score, school_rating, overview) VALUES
  ('src-nb-1', 'Downtown District', 'San Francisco', 'CA', 85, 95, 8.5, 'Walkable, vibrant and safe.');
