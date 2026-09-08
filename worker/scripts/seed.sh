#!/usr/bin/env bash
#
# Seeds a local development database with a landlord, an agent, a tenant and a
# handful of Lagos/Abuja listings, so the UI has something real to render.
#
# Safe to re-run: existing accounts are detected and reused.
#
# Usage: bash scripts/seed.sh [api-base-url]   (default http://127.0.0.1:8787)

set -euo pipefail
cd "$(dirname "$0")/.." || exit 1

API="${1:-http://127.0.0.1:8787}"
PASSWORD='SeededPass123!'

# Walks a dotted path through the API's { data: ... } envelope.
json() {
  python3 -c '
import json, sys
node = json.load(sys.stdin)
for part in sys.argv[1].split("."):
    node = node[part]
print(node)
' "$1"
}

register() {
  local name="$1" email="$2" role="$3"
  curl -s -X POST "$API/api/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$name\",\"email\":\"$email\",\"password\":\"$PASSWORD\",\"role\":\"$role\"}"
}

login() {
  curl -s -X POST "$API/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}"
}

# Register (or log in when the account already exists).
session() {
  local name="$1" email="$2" role="$3"
  local out
  out="$(register "$name" "$email" "$role")"
  if printf '%s' "$out" | grep -q access_token; then
    printf '%s' "$out"
  else
    login "$email"
  fi
}

LANDLORD="$(session 'Amara Okafor' 'landlord@agently.test' landlord)"
if ! printf '%s' "$LANDLORD" | grep -q access_token; then
  echo "Could not create the landlord account. Is the API running on $API?" >&2
  echo "$LANDLORD" >&2
  exit 1
fi

LANDLORD_TOKEN="$(printf '%s' "$LANDLORD" | json data.tokens.access_token)"
echo "Landlord: landlord@agently.test"

session 'Bisi Adeyemi' 'agent@agently.test' agent >/dev/null
session 'Tunde Bakare' 'tenant@agently.test' tenant >/dev/null
echo "Agent:    agent@agently.test"
echo "Tenant:   tenant@agently.test"

create_listing() {
  # Surfaces API errors: a silent `> /dev/null` here would let a rejected
  # listing look like a successful seed.
  local out
  out="$(curl -s -X POST "$API/api/properties" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $LANDLORD_TOKEN" \
    -d "$1")"
  if printf '%s' "$out" | grep -q '"data"'; then
    printf '  created: %s\n' "$(printf '%s' "$out" | json data.title)"
  else
    echo "  FAILED: $out" >&2
    return 1
  fi
}

create_listing '{
  "title": "Sunlit 2-bed apartment in Lekki Phase 1",
  "description": "A bright, recently renovated two-bedroom apartment a short walk from the Lekki-Ikoyi link bridge. Standing power supply, treated water and a dedicated parking space.",
  "type": "apartment", "price": 4500000, "status": "available",
  "address_line1": "14 Admiralty Way", "city": "Lekki", "state": "Lagos",
  "zip_code": "106104", "country": "Nigeria",
  "bedrooms": 2, "bathrooms": 2, "area_sqft": 1150,
  "latitude": 6.4474, "longitude": 3.4703,
  "amenities": ["parking", "generator", "borehole", "security"],
  "minimum_lease_months": 12, "deposit_amount": 450000 }'

create_listing '{
  "title": "Quiet 3-bed bungalow in Gwarinpa",
  "description": "Single-storey family home on a quiet street, with a large compound, borehole and a small garden. Pets considered.",
  "type": "house", "price": 3200000, "status": "available",
  "address_line1": "8 Cadastral Zone C", "city": "Abuja", "state": "FCT",
  "zip_code": "900108", "country": "Nigeria",
  "bedrooms": 3, "bathrooms": 3, "area_sqft": 1800,
  "latitude": 9.0765, "longitude": 7.3986,
  "amenities": ["garden", "borehole", "parking", "pet-friendly"],
  "minimum_lease_months": 12, "deposit_amount": 320000 }'

create_listing '{
  "title": "Modern studio in Yaba",
  "description": "Compact, fully fitted studio close to Yaba Tech and the mainland business district. Ideal for a single professional or a student.",
  "type": "studio", "price": 1500000, "status": "available",
  "address_line1": "22 Herbert Macaulay Way", "city": "Yaba", "state": "Lagos",
  "zip_code": "100212", "country": "Nigeria",
  "bedrooms": 1, "bathrooms": 1, "area_sqft": 420,
  "latitude": 6.5095, "longitude": 3.3711,
  "amenities": ["fitted-kitchen", "wifi", "security"],
  "minimum_lease_months": 6, "deposit_amount": 150000 }'

create_listing '{
  "title": "Shared 4-bed duplex in Ikate",
  "description": "Four-bedroom duplex let room by room. Two rooms currently available, each with a shared kitchen and living area.",
  "type": "room", "price": 900000, "status": "available",
  "address_line1": "5 Ikate Road", "city": "Ikate", "state": "Lagos",
  "zip_code": "106104", "country": "Nigeria",
  "bedrooms": 4, "bathrooms": 3, "area_sqft": 2200,
  "latitude": 6.4550, "longitude": 3.5230,
  "amenities": ["fitted-kitchen", "generator", "security"],
  "minimum_lease_months": 6, "deposit_amount": 90000 }'

create_listing '{
  "title": "Executive 4-bed terrace in Ikoyi",
  "description": "High-specification terrace house in a gated estate with 24-hour power, a gym and a swimming pool.",
  "type": "townhouse", "price": 12000000, "status": "available",
  "address_line1": "3 Glover Road", "city": "Ikoyi", "state": "Lagos",
  "zip_code": "106104", "country": "Nigeria",
  "bedrooms": 4, "bathrooms": 4, "area_sqft": 3200,
  "latitude": 6.4615, "longitude": 3.4340,
  "amenities": ["pool", "gym", "generator", "parking", "security"],
  "minimum_lease_months": 24, "deposit_amount": 1200000 }'

echo "Seeded 5 listings. Sign in with any of the accounts above using: $PASSWORD"
