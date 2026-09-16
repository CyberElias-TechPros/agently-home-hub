# ── Agently API — Cloudflare D1 schema ─────────────────────────────────────
# Single-source migrations for the deployed Worker. The live schema statements
# live in server/src/db/db.js (SCHEMA_STATEMENTS) so the Worker can run them
# idempotently at boot; this `.sql` file mirrors them for `wrangler d1 execute`
# migrations so you can pre-create tables from the CLI if you prefer.

-- The authoritative SQLite/D1-compatible statements are generated from
-- server/src/db/db.js. Run the following to dump them to this file:
--
--   node -e "import('./src/db/db.js').then(m=>{const {execSync}=require('child_process');})"
--
-- See DEPLOYMENT.md for step-by-step instructions.
