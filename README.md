# Agently

Agently is a rental platform for the Nigerian market. It connects tenants,
landlords and agents and covers the rental lifecycle: search, enquiries,
agreements, maintenance and move-out.

This document describes what is actually in the repository and how to run it.
Product intent lives in [`plans/`](./plans); architecture in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md); deployment in
[`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## What is built and working

| Area | State | Notes |
| --- | --- | --- |
| Property search | Implemented, verified | Full-text, city, type, bedrooms, price, sorting, pagination; list and map views |
| Property detail | Implemented, verified | Gallery, amenities, JSON-LD structured data, enquiry sidebar |
| Accounts | Implemented, verified | Registration, login, refresh rotation with reuse detection, password reset, roles |
| Enquiries / bookings | Implemented, verified | Tenant requests a move-in date; landlord approves or declines with a reason |
| Maintenance | Implemented, verified | Tenant raises a request; landlord triages with published response targets |
| Messaging | Implemented, verified | Threaded conversations between tenant and landlord/agent |
| Documents | Implemented, verified | Upload to R2 via signed URL, download via short-lived link |
| Agent CRM | Implemented, verified | Leads, pipeline, showings, commissions |
| Roommate matching | Implemented, verified | Compatibility scoring across budget, lifestyle, habits and location |
| Vendor marketplace | Implemented, verified | Directory, booking requests, reviews |
| Administration | Implemented, verified | Platform analytics, user roles, account suspension, audit log |
| Notifications | Implemented, verified | In-app notification centre, delivered through a queue |

"Verified" means it is exercised by an automated test in this repository — see
[Testing](#testing).

## What is not built

Earlier documentation in this repository described insurance, mortgage
calculators, property auctions, automated valuations, neighbourhood insights,
360° virtual tours, multi-language support and offline/PWA support. **None of
that code exists**, and the pages that claimed to provide it were removed rather
than left as facades. There is no AI/ML component: roommate matching is a
deterministic weighted score, documented in `worker/src/services/matching.ts`.

Not implemented, and deliberately so:

- **Payments.** Rent and deposits are never collected by Agently. Bookings
  record an agreed rent; money moves between tenant and landlord directly.
- **Email delivery.** The API sends mail when `RESEND_API_KEY` is configured and
  records-and-skips otherwise, so local development needs no provider.
- **Realtime push.** Messaging is served over a Durable Object, but the browser
  currently polls every 10 seconds rather than holding a WebSocket open.

---

## Architecture

```
Browser (React SPA)  ──►  Vercel  ──rewrite──►  Cloudflare Worker (Hono)
                                                       │
                        ┌──────────┬──────────┬───────┴────┬────────────┐
                        │ D1       │ R2       │ KV          │ Queues     │
                        │ relational│ documents│ cache +    │ async      │
                        │          │          │ rate limits │ notifications│
                        └──────────┴──────────┴────────────┴────────────┘
                                                       │
                                              Durable Object (realtime hub)
```

- **Frontend** — Vite + React 18 + TypeScript + Tailwind + shadcn/ui, in `src/`.
- **API** — Hono on Cloudflare Workers, in `worker/src/`.
- **Data** — D1 (SQLite at the edge) for records, R2 for documents, KV for
  caching and rate limiting, Queues for notification delivery, Durable Objects
  for realtime presence.

The API is served under `/api/*`. The browser always calls the same origin, and
Vercel rewrites `/api/*` to the Worker, so there are no cross-origin requests
and no API URL in client configuration.

---

## Getting started

Requires Node 20+.

```bash
# 1. Frontend dependencies
npm install

# 2. API dependencies
cd worker && npm install

# 3. Create the API's local secrets file
cp worker/.dev.vars.example worker/.dev.vars
# then set JWT_SECRET — generate one with:
#   openssl rand -base64 48

# 4. Create the local database
cd worker && npm run db:migrate:local
```

Run the API and the app in two terminals:

```bash
cd worker && npm run dev     # API on http://127.0.0.1:8787
npm run dev                  # App on http://localhost:8080
```

The Vite dev server proxies `/api` to the Worker, so the app behaves exactly as
it does in production.

To populate the API with sample landlords, agents, tenants and Lagos/Abuja
listings:

```bash
cd worker && npm run db:seed:local
# sign in as landlord@agently.test / agent@agently.test / tenant@agently.test
# password: SeededPass123!
```

---

## Testing

Three suites, all runnable offline and all required to pass in CI:

```bash
# Frontend: unit + component + page smoke tests (jsdom)
npm run test                 # 88 tests

# API: domain unit tests (Node)
cd worker && npm run test    # 37 tests

# API: end-to-end against a real Worker with simulated D1/R2/KV/Queues
cd worker && npm run test:e2e   # 68 checks
```

The end-to-end suite starts its own Worker on a free port with a throwaway
state directory and a generated signing key, so it never touches your
development database and can run concurrently with itself.

Also available:

```bash
npm run typecheck            # strict TypeScript, frontend
cd worker && npm run typecheck
npm run lint
npm run build                # type check, bundle, generate sitemap
```

---

## Repository layout

```
src/            Frontend application
worker/         Cloudflare Worker API
  migrations/   D1 schema
  scripts/      e2e.sh (end-to-end suite), seed.sh (dev data)
  src/routes/   HTTP handlers
  src/domain/   business rules
  src/services/ cross-cutting services (notifications, matching)
docs/           Architecture, deployment, API reference
plans/          Product requirements, flows and feature roadmap
scripts/        Build-time sitemap generation
```

## Conventions worth knowing

- **Money.** The database stores integer kobo; the API returns **naira** (it
  divides by 100 in every DTO). Never divide again in the UI — see the
  contract note at the top of `src/lib/format.ts`.
- **Response envelopes.** `{ data: … }` for anything that returns something,
  `{ success: true }` for acknowledgements, `{ error: { code, message,
  request_id } }` for failures.
- **IDs** are UUIDv4 generated by the application, never sequential.
- **Deletes are soft.** Rows carry `deleted_at` and are filtered out by queries;
  the nightly cron purges what is old enough.

## Licence

No licence file is present; all rights are reserved until one is added.
