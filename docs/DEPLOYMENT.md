# Deployment

Two deployables, deployed in order: **API first, then frontend.**

## Prerequisites

- A Cloudflare account with Workers, D1, R2, KV, Queues and Durable Objects enabled.
- A Vercel project pointed at this repository.
- Node 20+ locally.

---

## 1. Cloudflare resources

```bash
cd worker

npx wrangler d1 create agently-db
npx wrangler r2 bucket create agently-documents
npx wrangler kv:namespace create CACHE
npx wrangler kv:namespace create RATE_LIMITS
npx wrangler queues create agently-notifications
```

Each command prints an id. Paste them into the `[env.production]` block of
`worker/wrangler.toml`, replacing the `0000…` placeholders. Repeat for
`[env.staging]` with its own resources if you want a staging environment.

> Placeholder ids are checked in on purpose so that `wrangler deploy --dry-run`
> works without an account. **A deploy with placeholder ids will fail**, which
> is the intended behaviour — it cannot silently deploy against nothing.

## 2. Secrets

Secrets are never written to `wrangler.toml`. Set them per environment:

```bash
cd worker

# Required
npx wrangler secret put JWT_SECRET --env production
#   generate with: openssl rand -base64 48

# Optional
npx wrangler secret put RESEND_API_KEY --env production   # outbound email
npx wrangler secret put EMAIL_FROM --env production       # e.g. Agently <no-reply@agently.app>
npx wrangler secret put PUBLIC_WEB_URL --env production   # https://agently.app
```

Without `RESEND_API_KEY` the API logs the message it would have sent and
continues, so email-dependent flows (verification, password reset) do not break
in environments without a provider.

## 3. Database migrations

```bash
cd worker
npx wrangler d1 migrations apply agently-db --env production --remote
```

Migrations are additive and safe to re-run; applied migrations are recorded and
skipped. **Take a D1 export first** — there is no automatic rollback:

```bash
npx wrangler d1 export agently-db --env production --remote --output backup.sql
```

## 4. Deploy the API

```bash
cd worker
npx wrangler deploy --env production
```

Verify before moving on:

```bash
curl https://<your-worker-host>/health
# {"status":"ok","version":"v1","environment":"production",...}
```

## 5. Point Vercel at the API

Edit `vercel.json` and replace the placeholder worker host:

```json
{ "source": "/api/:path*", "destination": "https://agently-api.<your-account>.workers.dev/api/:path*" }
```

Use a custom domain (`api.agently.app`) rather than `*.workers.dev` in
production; the rewrite preserve the `/api` prefix, and the Worker mounts its
routes under `/api`.

Set in the Vercel project settings, or at build time:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SITE_URL` | Recommended | Canonical origin used for canonical tags, Open Graph URLs and the sitemap. Defaults to `https://agently.app` |
| `VITE_API_URL` | No | Leave unset. The app calls `/api` on its own origin; setting this is only for pointing a local build at a remote API |

> Never put a secret in a `VITE_`-prefixed variable — every one of them is
> inlined into the JavaScript bundle and is therefore public.

## 6. Deploy the frontend

```bash
npx vercel deploy --prod
```

Or let the `deploy` workflow do it on push to `main`.

---

## Post-deploy checks

```bash
# Liveness (no database access)
curl -fsS https://api.agently.app/health

# Readiness (touches D1)
curl -fsS https://api.agently.app/health/ready

# The SPA is served and rewrites deep links
curl -fsS -o /dev/null -w '%{http_code}\n' https://agently.app/properties

# The rewrite reaches the API
curl -fsS https://agently.app/api/health

# Sitemap and robots
curl -fsS https://agently.app/sitemap.xml | head -5
curl -fsS https://agently.app/robots.txt
```

Then confirm in the browser:

1. Home page loads and shows featured listings.
2. `/properties` returns results and the map view renders pins.
3. Register, sign in, and open `/dashboard`.
4. Request a property as a tenant and approve it as the landlord.

---

## Rollback

- **Frontend** — promote the previous deployment in the Vercel dashboard. It is
  instant and carries no data risk.
- **API** — `npx wrangler rollback --env production` restores the previous
  Worker version. Because the frontend is deployed after the API, roll the API
  back first only if the change is not backwards compatible with the live
  frontend.
- **Database** — there is no automatic rollback. Restore from the D1 export taken
  before migrating.

## Environments

| | Local | Staging | Production |
| --- | --- | --- | --- |
| Config | top level of `wrangler.toml` | `[env.staging]` | `[env.production]` |
| Secrets | `worker/.dev.vars` (`--var` for tests) | `wrangler secret put --env staging` | `wrangler secret put --env production` |
| Data | `.wrangler/state`, disposable | its own D1/R2/KV | production resources |

Local development uses the **top level** of `wrangler.toml` rather than a named
environment, because Wrangler does not inherit top-level bindings into named
environments and only loads `.dev.vars` (not `.dev.vars.<env>`) for the
top-level config. That combination is the source of several confusing "it works
locally" failures, so it is avoided by construction.
