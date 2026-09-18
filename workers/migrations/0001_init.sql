-- =============================================================
-- Agently D1 schema (Cloudflare)  v2.0
-- Full real-estate OS data model.
-- =============================================================

PRAGMA foreign_keys = ON;

-- ---------- Users & identity ----------
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,          -- uuid
  name               TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash      TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'tenant'
                     CHECK (role IN ('tenant','landlord','agent','manager','admin','vendor')),
  verified           INTEGER NOT NULL DEFAULT 0,
  phone              TEXT,
  avatar_url         TEXT,
  trust_score        INTEGER NOT NULL DEFAULT 50,
  kyc_status         TEXT NOT NULL DEFAULT 'not_started',
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'access'
              CHECK (kind IN ('access','refresh','verification','password_reset')),
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);

-- ---------- Properties ----------
CREATE TABLE IF NOT EXISTS properties (
  id             TEXT PRIMARY KEY,
  landlord_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  type           TEXT NOT NULL DEFAULT 'apartment'
                 CHECK (type IN ('apartment','house','condo','studio','townhouse')),
  price          REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'USD',
  address        TEXT NOT NULL DEFAULT '',
  city           TEXT NOT NULL DEFAULT '',
  state          TEXT NOT NULL DEFAULT '',
  zip_code       TEXT,
  country        TEXT NOT NULL DEFAULT 'US',
  lat            REAL,
  lng            REAL,
  images         TEXT NOT NULL DEFAULT '[]',   -- JSON array of URLs
  bedrooms       INTEGER NOT NULL DEFAULT 0,
  bathrooms      INTEGER NOT NULL DEFAULT 0,
  area           REAL NOT NULL DEFAULT 0,
  year_built     INTEGER,
  amenities      TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  status         TEXT NOT NULL DEFAULT 'available'
                 CHECK (status IN ('available','occupied','maintenance','off_market')),
  available_from TEXT,
  featured       INTEGER NOT NULL DEFAULT 0,
  verified       INTEGER NOT NULL DEFAULT 0,
  rules          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city   ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_price  ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_landlord ON properties(landlord_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, property_id)
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Saved search',
  filters    TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------- Bookings ----------
CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT PRIMARY KEY,
  property_id    TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  landlord_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','cancelled','completed','rejected')),
  message        TEXT,
  total_price    REAL NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant   ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_landlord ON bookings(landlord_id);
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);

-- ---------- Maintenance ----------
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id           TEXT PRIMARY KEY,
  property_id  TEXT REFERENCES properties(id) ON DELETE SET NULL,
  tenant_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  landlord_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL DEFAULT 'other',
  priority     TEXT NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low','medium','high','emergency')),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','in_progress','resolved','cancelled')),
  images       TEXT NOT NULL DEFAULT '[]',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant  ON maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status  ON maintenance_requests(status);

-- ---------- Messaging ----------
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  user_a_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id TEXT,
  archived_a  INTEGER NOT NULL DEFAULT 0,
  archived_b  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_a_id, user_b_id, property_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL,
  kind            TEXT NOT NULL DEFAULT 'text'
                  CHECK (kind IN ('text','image','file','system')),
  file_url        TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS message_reads (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  last_read_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'system',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  link       TEXT,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at);

-- ---------- Leads & CRM ----------
CREATE TABLE IF NOT EXISTS leads (
  id               TEXT PRIMARY KEY,
  owner_id         TEXT REFERENCES users(id) ON DELETE SET NULL,     -- agent
  tenant_id        TEXT REFERENCES users(id) ON DELETE SET NULL,     -- prospective tenant
  property_id      TEXT REFERENCES properties(id) ON DELETE SET NULL,
  first_name       TEXT NOT NULL,
  last_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  source           TEXT NOT NULL DEFAULT 'website',
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','contacted','qualified','touring','negotiating',
                                     'closed_won','closed_lost')),
  priority         TEXT NOT NULL DEFAULT 'medium',
  budget_min       REAL,
  budget_max       REAL,
  notes            TEXT,
  lead_score       REAL NOT NULL DEFAULT 50,
  next_follow_up_at TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_owner  ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ---------- Payments (log; real gateway bindings in services ----------
CREATE TABLE IF NOT EXISTS payments (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id     TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  amount         REAL NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'USD',
  status         TEXT NOT NULL DEFAULT 'created'
                 CHECK (status IN ('created','pending','succeeded','failed','refunded')),
  provider       TEXT NOT NULL DEFAULT 'stripe',
  provider_ref   TEXT,
  description    TEXT,
  metadata       TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- ---------- Contact / support ----------
CREATE TABLE IF NOT EXISTS contact_submissions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------- Seed ----------
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, verified, phone, avatar_url, trust_score)
VALUES
  ('seed-tenant',  'Ada Tenant',  'tenant@agently.dev',  'pbkdf2_sha256$100000$etzTI78SNY7iUDkIKXrAKw==$aDqgqXxXxdjbKLULaqykYWvriN83d+cXtc/j/Np9OlA=', 'tenant',  1, '+234 800 000 0001', NULL, 92),
  ('seed-landlord','Will Owner', 'landlord@agently.dev','pbkdf2_sha256$100000$etzTI78SNY7iUDkIKXrAKw==$aDqgqXxXxdjbKLULaqykYWvriN83d+cXtc/j/Np9OlA=', 'landlord',1, '+234 800 000 0002', NULL, 95),
  ('seed-agent',   'Rae Agent',  'agent@agently.dev',   'pbkdf2_sha256$100000$etzTI78SNY7iUDkIKXrAKw==$aDqgqXxXxdjbKLULaqykYWvriN83d+cXtc/j/Np9OlA=', 'agent',   1, '+234 800 000 0003', NULL, 90),
  ('seed-admin',   'Admin',      'admin@agently.dev',   'pbkdf2_sha256$100000$etzTI78SNY7iUDkIKXrAKw==$aDqgqXxXxdjbKLULaqykYWvriN83d+cXtc/j/Np9OlA=', 'admin',   1, '+234 800 000 0004', NULL, 100);
