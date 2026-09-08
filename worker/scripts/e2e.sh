#!/usr/bin/env bash
#
# End-to-end smoke test for the Agently API.
#
# Boots a Wrangler dev server against a throwaway local state directory (D1, R2,
# KV and the queue are all simulated), applies the migrations, then exercises the
# real HTTP surface: authentication, authorisation, property search, bookings,
# maintenance lifecycle, messaging, notifications, documents and admin gating.
#
# Usage:  npm run test:e2e
#
# Requires: wrangler, curl, python3. No Cloudflare account needed.

set -u
cd "$(dirname "$0")/.." || exit 1

# Pick a free port so repeated (or concurrent) runs never collide with a
# leftover dev server, which would silently test the wrong instance.
PORT="$(python3 -c 'import socket;s=socket.socket();s.bind(("127.0.0.1",0));print(s.getsockname()[1]);s.close()')"
STATE="$(mktemp -d)/agently-e2e"

# The suite must not depend on a developer's local `.dev.vars`. A throwaway
# signing key is generated per run; nothing else needs to be secret because
# everything runs against ephemeral local state.
JWT_SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')"
API="http://127.0.0.1:${PORT}"
STAMP="$(date +%s)"
PASS=0
FAIL=0
FAILED_NAMES=()

chk() { # chk <name> <expected-substring> <actual>
  if echo "$3" | grep -q "$2"; then
    printf '  \033[32mPASS\033[0m %s\n' "$1"
    PASS=$((PASS + 1))
  else
    printf '  \033[31mFAIL\033[0m %s\n' "$1"
    printf '        expected to contain: %s\n' "$2"
    printf '        actual: %s\n' "$(echo "$3" | head -c 400)"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$1")
  fi
}

section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

cleanup() {
  if [ -n "${WORKER_PID:-}" ]; then kill "$WORKER_PID" >/dev/null 2>&1 || true; fi
  rm -rf "$STATE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== Preparing isolated local state =="
npx wrangler d1 migrations apply agently-db --local --persist-to "$STATE" >/dev/null 2>&1 || {
  echo "migrations failed"; exit 1; }

echo "== Starting API on ${API} =="
LOG="$(mktemp -d)/agently-e2e-worker.log"
npx wrangler dev --port "$PORT" --ip 127.0.0.1 --persist-to "$STATE" \
  --var "JWT_SECRET:$JWT_SECRET" >"$LOG" 2>&1 &
WORKER_PID=$!

# Wait for readiness rather than sleeping a fixed amount.
for _ in $(seq 1 60); do
  if curl -sf "${API}/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -sf "${API}/health" >/dev/null || {
  echo "API did not start on ${API}"
  tail -c 4000 "$LOG" | tr -d '\000'
  exit 1; }

L_EMAIL="ada.${STAMP}@example.com"
T_EMAIL="tunde.${STAMP}@example.com"
O_EMAIL="outsider.${STAMP}@example.com"

jwt() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)" 2>/dev/null; }

section "Health"
chk "health endpoint responds" '"status":"ok"' "$(curl -s $API/api/health)"
chk "readiness checks the database" '"database":"ok"' "$(curl -s $API/health/ready)"

section "Authentication"
R=$(curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Ada Landlord\",\"email\":\"$L_EMAIL\",\"password\":\"correct-horse-battery\",\"role\":\"landlord\"}")
chk "register issues tokens" '"access_token"' "$R"
LT=$(echo "$R" | jwt "['data']['tokens']['access_token']")
LRF=$(echo "$R" | jwt "['data']['tokens']['refresh_token']")

R=$(curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Tunde Tenant\",\"email\":\"$T_EMAIL\",\"password\":\"another-good-passphrase\",\"role\":\"tenant\"}")
chk "second user registers" '"access_token"' "$R"
TT=$(echo "$R" | jwt "['data']['tokens']['access_token']")

R=$(curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Nosy Outsider\",\"email\":\"$O_EMAIL\",\"password\":\"yet-another-passphrase\",\"role\":\"tenant\"}")
OT=$(echo "$R" | jwt "['data']['tokens']['access_token']")

chk "duplicate registration does not confirm the account exists" "pending_verification" \
  "$(curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
     -d "{\"name\":\"Impostor\",\"email\":\"$L_EMAIL\",\"password\":\"correct-horse-battery\",\"role\":\"tenant\"}")"

chk "weak password rejected" "at least 10 characters" \
  "$(curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
     -d "{\"name\":\"Weak\",\"email\":\"weak.$STAMP@example.com\",\"password\":\"short\",\"role\":\"tenant\"}")"

chk "wrong password rejected" "invalid_credentials" \
  "$(curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
     -d "{\"email\":\"$L_EMAIL\",\"password\":\"wrong-password-entirely\"}")"

chk "protected route rejects anonymous caller" '"code":"unauthorized"' "$(curl -s $API/api/auth/me)"
chk "forged token rejected" '"code":"unauthorized"' "$(curl -s $API/api/auth/me -H 'Authorization: Bearer not.a.real.token')"
chk "malformed token rejected" '"code":"unauthorized"' "$(curl -s $API/api/auth/me -H 'Authorization: Bearer abc')"
chk "basic auth scheme rejected" '"code":"unauthorized"' "$(curl -s $API/api/auth/me -H 'Authorization: Basic abc123')"

R=$(curl -s -X POST $API/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$LRF\"}")
chk "refresh issues a new token" '"access_token"' "$R"
REUSED=$(curl -s -X POST $API/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$LRF\"}")
chk "refresh token cannot be reused (rotation)" '"code":"unauthorized"' "$REUSED"

# The token minted by that first refresh must die with it: a replayed token is
# the signature of a stolen token, and the containment is worthless if the
# thief keeps the fresh token while the real owner is locked out.
LRF2=$(echo "$R" | jwt "['data']['tokens']['refresh_token']")
chk "replay revokes the whole token family" '"code":"unauthorized"' \
  "$(curl -s -X POST $API/api/auth/refresh -H 'Content-Type: application/json' -d "{\"refresh_token\":\"$LRF2\"}")"

section "Properties & search"
R=$(curl -s -X POST $API/api/properties -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' -d '{
 "title":"Sunlit 2-Bed Apartment in Lekki Phase 1",
 "description":"Bright, newly renovated two bedroom apartment with backup power and a borehole.",
 "type":"apartment","price":2500000,"currency":"NGN","deposit":1500000,
 "address_line1":"14 Admiralty Way","city":"Lekki","state":"Lagos","zip_code":"106104","country":"Nigeria",
 "latitude":6.4281,"longitude":3.4219,"bedrooms":2,"bathrooms":2,"area_sqft":1100,
 "amenities":["parking","generator","borehole","security"],"images":[],"available_from":"2026-10-01"}')
chk "landlord publishes a listing" '"slug":"sunlit-2-bed-apartment-in-lekki-phase-1"' "$R"
PID=$(echo "$R" | jwt "['data']['id']")

chk "tenant cannot publish a listing" '"code":"forbidden"' \
  "$(curl -s -X POST $API/api/properties -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
     -d '{"title":"Not Allowed","type":"apartment","price":100,"address_line1":"x","city":"y","state":"z","zip_code":"1"}')"

chk "public search is anonymous" "Sunlit 2-Bed" "$(curl -s "$API/api/properties?q=Lekki")"
chk "search returns pagination metadata" '"total_pages"' "$(curl -s "$API/api/properties?per_page=5")"
chk "amenity filter matches" "Sunlit 2-Bed" "$(curl -s "$API/api/properties?amenities=borehole")"
chk "amenity filter excludes non-matches" '"total":0' "$(curl -s "$API/api/properties?amenities=pool")"
chk "price filter excludes non-matches" '"total":0' "$(curl -s "$API/api/properties?min_price=9000000")"
chk "slug lookup works" "Sunlit 2-Bed" "$(curl -s "$API/api/properties/sunlit-2-bed-apartment-in-lekki-phase-1")"
chk "inverted price range rejected" "validation_failed" "$(curl -s "$API/api/properties?min_price=500&max_price=10")"
chk "unknown property returns 404" '"code":"not_found"' "$(curl -s "$API/api/properties/does-not-exist-at-all")"
chk "oversized page rejected" "validation_failed" "$(curl -s "$API/api/properties?per_page=5000")"

section "Bookings"
R=$(curl -s -X POST $API/api/bookings -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
  -d "{\"property_id\":\"$PID\",\"start_date\":\"2026-10-01\",\"message\":\"Interested — may I view it?\"}")
chk "tenant requests a booking" '"status":"pending"' "$R"
BID=$(echo "$R" | jwt "['data']['id']")

chk "duplicate active booking rejected" '"code":"conflict"' \
  "$(curl -s -X POST $API/api/bookings -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
     -d "{\"property_id\":\"$PID\",\"start_date\":\"2026-11-01\"}")"

chk "past start date rejected" "validation_failed" \
  "$(curl -s -X POST $API/api/bookings -H "Authorization: Bearer $OT" -H 'Content-Type: application/json' \
     -d "{\"property_id\":\"$PID\",\"start_date\":\"2020-01-01\"}")"

chk "tenant cannot approve their own booking" '"code":"forbidden"' \
  "$(curl -s -X POST $API/api/bookings/$BID/decision -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
     -d '{"decision":"approved"}')"

chk "stranger cannot decide the booking" '"code":"forbidden"' \
  "$(curl -s -X POST $API/api/bookings/$BID/decision -H "Authorization: Bearer $OT" -H 'Content-Type: application/json' \
     -d '{"decision":"approved"}')"

R=$(curl -s -X POST $API/api/bookings/$BID/decision -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
  -d '{"decision":"approved"}')
chk "landlord approves the booking" '"status":"approved"' "$R"
chk "approval marks the listing occupied" '"status":"occupied"' "$(curl -s "$API/api/properties/$PID")"
chk "deciding twice is rejected" '"code":"conflict"' \
  "$(curl -s -X POST $API/api/bookings/$BID/decision -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
     -d '{"decision":"rejected"}')"

section "Maintenance"
R=$(curl -s -X POST $API/api/maintenance -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' -d "{
 \"property_id\":\"$PID\",\"title\":\"Kitchen tap leaking\",
 \"description\":\"The kitchen mixer has been dripping constantly for three days.\",
 \"category\":\"plumbing\",\"priority\":\"high\",\"area_affected\":\"Kitchen\"}")
chk "tenant raises a request" '"status":"pending"' "$R"
MID=$(echo "$R" | jwt "['data']['id']")
chk "response target follows priority" '"response_target_hours":24' "$R"

chk "stranger cannot touch the request" '"code":"forbidden"' \
  "$(curl -s -X PATCH $API/api/maintenance/$MID -H "Authorization: Bearer $OT" -H 'Content-Type: application/json' \
     -d '{"status":"in_progress"}')"

chk "invalid transition rejected" '"code":"conflict"' \
  "$(curl -s -X PATCH $API/api/maintenance/$MID -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
     -d '{"status":"completed"}')"

R=$(curl -s -X PATCH $API/api/maintenance/$MID -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
  -d '{"status":"assigned"}')
chk "landlord assigns the request" '"status":"assigned"' "$R"
R=$(curl -s -X PATCH $API/api/maintenance/$MID -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
  -d '{"status":"in_progress","landlord_notes":"Plumber booked for Tuesday."}')
chk "request moves to in progress" '"status":"in_progress"' "$R"
R=$(curl -s -X PATCH $API/api/maintenance/$MID -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
  -d '{"status":"completed","actual_cost":25000}')
chk "request completes with a cost" '"status":"completed"' "$R"
chk "completed request is terminal" '"code":"conflict"' \
  "$(curl -s -X PATCH $API/api/maintenance/$MID -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
     -d '{"status":"pending"}')"

section "Messaging"
LUID=$(curl -s $API/api/auth/me -H "Authorization: Bearer $LT" | jwt "['data']['user']['id']")
TUID=$(curl -s $API/api/auth/me -H "Authorization: Bearer $TT" | jwt "['data']['user']['id']")

R=$(curl -s -X POST $API/api/conversations -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
  -d "{\"participant_id\":\"$LUID\",\"property_id\":\"$PID\",\"content\":\"Hello, is the apartment still available?\"}")
chk "tenant starts a conversation" '"conversation"' "$R"
CID=$(echo "$R" | jwt "['data']['conversation']['id']")

R=$(curl -s -X POST $API/api/conversations -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
  -d "{\"participant_id\":\"$TUID\",\"property_id\":\"$PID\",\"content\":\"Yes it is.\"}")
chk "same pair reuses one conversation" "$CID" "$(echo "$R" | jwt "['data']['conversation']['id']")"

chk "stranger cannot read the thread" '"code":"not_found"' \
  "$(curl -s $API/api/conversations/$CID/messages -H "Authorization: Bearer $OT")"
chk "participant reads the thread" "Hello, is the apartment" \
  "$(curl -s $API/api/conversations/$CID/messages -H "Authorization: Bearer $TT")"
chk "marking read succeeds" '"success":true' \
  "$(curl -s -X POST $API/api/conversations/$CID/read -H "Authorization: Bearer $LT" -H 'Content-Type: application/json')"

section "Notifications"
chk "landlord was notified about the booking" "booking_requested" \
  "$(curl -s $API/api/notifications -H "Authorization: Bearer $LT")"
chk "unread count is exposed" '"count"' "$(curl -s $API/api/notifications/unread-count -H "Authorization: Bearer $LT")"
chk "marking all read succeeds" '"success":true' \
  "$(curl -s -X POST $API/api/notifications/read-all -H "Authorization: Bearer $LT" -H 'Content-Type: application/json')"
chk "unread count drops to zero" '"count":0' \
  "$(curl -s $API/api/notifications/unread-count -H "Authorization: Bearer $LT")"

section "Documents (R2)"
R=$(curl -s -X POST $API/api/documents/upload-intent -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
  -d '{"name":"proof-of-income.pdf","category":"proof_of_income","mime_type":"application/pdf","size_bytes":2048}')
chk "upload intent returns an upload URL" '"upload_url"' "$R"
chk "executable uploads rejected" "validation_failed" \
  "$(curl -s -X POST $API/api/documents/upload-intent -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
     -d '{"name":"x.exe","category":"other","mime_type":"application/x-msdownload","size_bytes":100}')"
chk "oversized uploads rejected" "payload_too_large" \
  "$(curl -s -X POST $API/api/documents/upload-intent -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
     -d '{"name":"big.pdf","category":"other","mime_type":"application/pdf","size_bytes":99999999}')"

section "Agent CRM"
R=$(curl -s -X POST $API/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Agent Amaka\",\"email\":\"amaka.$STAMP@example.com\",\"password\":\"agent-passphrase-here\",\"role\":\"agent\"}")
AT=$(echo "$R" | jwt "['data']['tokens']['access_token']")
R=$(curl -s -X POST $API/api/leads -H "Authorization: Bearer $AT" -H 'Content-Type: application/json' \
  -d '{"first_name":"Chidi","last_name":"Okafor","email":"chidi@example.com","budget_min":1000000,"budget_max":2000000,"priority":"high","lead_score":70}')
chk "agent creates a lead" '"status":"new"' "$R"
chk "statistics endpoint is not shadowed by /leads/:id" '"total_leads"' \
  "$(curl -s $API/api/leads/statistics -H "Authorization: Bearer $AT")"
chk "non-agent cannot read leads" '"code":"forbidden"' "$(curl -s $API/api/leads -H "Authorization: Bearer $TT")"
chk "showings endpoint responds" '"data"' "$(curl -s $API/api/leads/showings -H "Authorization: Bearer $AT")"
chk "commissions endpoint responds" '"data"' "$(curl -s $API/api/leads/commissions -H "Authorization: Bearer $AT")"

section "Roommate matching"
R=$(curl -s -X PUT $API/api/roommates/profile -H "Authorization: Bearer $TT" -H 'Content-Type: application/json' \
  -d '{"headline":"Quiet professional","preferred_city":"Lagos","cleanliness":4,"social_level":2,"budget_min":300000,"budget_max":600000}')
chk "tenant saves a roommate profile" '"preferred_city":"Lagos"' "$R"
curl -s -X PUT $API/api/roommates/profile -H "Authorization: Bearer $OT" -H 'Content-Type: application/json' \
  -d '{"headline":"Also quiet","preferred_city":"Lagos","cleanliness":4,"social_level":2,"budget_min":350000,"budget_max":650000}' >/dev/null
chk "matches are ranked for compatible profiles" '"match_score"' "$(curl -s $API/api/roommates/matches -H "Authorization: Bearer $TT")"
chk "match score is high for near-identical profiles" '"match_score":[6-9][0-9]' \
  "$(curl -s $API/api/roommates/matches -H "Authorization: Bearer $TT")"

section "Vendor marketplace"
R=$(curl -s -X POST $API/api/vendors/bookings -H "Authorization: Bearer $LT" -H 'Content-Type: application/json' \
  -d "{\"contractor_id\":\"00000000-0000-0000-0000-000000000000\",\"description\":\"Replace the kitchen mixer tap.\"}")
chk "unknown contractor rejected" '"code":"not_found"' "$R"
chk "vendor list is public to signed-in users" '"data"' "$(curl -s $API/api/vendors -H "Authorization: Bearer $TT")"

section "Administration"
chk "non-admin blocked from analytics" '"code":"forbidden"' "$(curl -s $API/api/admin/analytics -H "Authorization: Bearer $LT")"
chk "anonymous blocked from admin" '"code":"unauthorized"' "$(curl -s $API/api/admin/analytics)"

section "Platform hygiene"
chk "unknown route returns a 404 envelope" '"code":"not_found"' "$(curl -s $API/does-not-exist)"
chk "OPTIONS preflight is answered" "" "$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS $API/api/auth/login -H 'Origin: http://localhost:8080' -H 'Access-Control-Request-Method: POST')"
chk "security headers are present" "nosniff" "$(curl -s -D - -o /dev/null $API/api/health | tr -d '\r')"
chk "disallowed origin gets no CORS header" "" "$(curl -s -D - -o /dev/null $API/api/health -H 'Origin: https://evil.example' | grep -c 'Access-Control-Allow-Origin' || true)"

printf '\n\033[1mRESULT:\033[0m %s passed, %s failed\n' "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  printf '\033[31mFailing checks:\033[0m\n'
  for name in "${FAILED_NAMES[@]}"; do printf '  - %s\n' "$name"; done
  exit 1
fi
printf '\033[32mAll end-to-end checks passed.\033[0m\n'
