# API reference

Base URL: `/api` (same origin as the app in production; proxied to
`http://127.0.0.1:8787` by Vite in development).

## Conventions

### Response envelopes

```jsonc
// something was returned
{ "data": { … } }

// a list
{ "data": [ … ], "pagination": { "page": 1, "per_page": 20, "total": 42, "total_pages": 3 } }

// an action was confirmed
{ "success": true }

// something went wrong
{ "error": { "code": "validation_failed", "message": "…", "request_id": "…", "details": { … } } }
```

Every failure carries a `request_id` that also appears in the API logs, and an
`X-Request-Id` response header. Quote it in a bug report.

### Money

All monetary values are **naira** (major units). The database stores kobo; every
DTO divides by 100 on the way out. Do not divide again.

### Errors

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `validation` | Malformed request |
| 401 | `unauthorized` | Missing, expired or revoked credentials |
| 403 | `forbidden` | Authenticated but not permitted |
| 404 | `not_found` | No such resource, or not visible to you |
| 409 | `conflict` | The change conflicts with current state |
| 422 | `validation` | Schema validation failed; `details` maps field → messages |
| 429 | `rate_limited` | Too many requests |
| 500 | `internal_error` | Unexpected server fault |

### Authentication

Send `Authorization: Bearer <access_token>`. Access tokens live 15 minutes;
refresh tokens 30 days. When an access token expires, call
`POST /api/auth/refresh` — the browser client does this automatically and retries
the original request once.

Refresh tokens rotate on every use. Presenting a spent refresh token revokes the
entire token family, which is how a stolen token is contained once it is used.

---

## Health

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | — | Liveness. Never touches the database |
| GET | `/health/ready` | — | Readiness. Runs `SELECT 1` against D1 |

## Accounts

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | `201` with `{ data: { user, tokens } }`. Returns `202 { data: { pending_verification: true } }` if the address is already known, so it cannot be used to discover who has an account |
| POST | `/auth/login` | — | `{ data: { user, tokens } }` |
| POST | `/auth/refresh` | — | `{ data: { tokens } }` |
| POST | `/auth/logout` | Bearer | Revokes the current session, or every session if `refresh_token` is omitted |
| GET | `/auth/me` | Bearer | `{ data: { user } }` |
| POST | `/auth/verify-email` | — | Consumes a verification token |
| POST | `/auth/password/forgot` | — | Always succeeds, to avoid disclosing which addresses exist |
| POST | `/auth/password/reset` | — | Consumes a reset token |

## Profile

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/profile` | Bearer |
| PATCH | `/profile` | Bearer |
| POST | `/profile/password` | Bearer — signs out every other device |
| GET | `/profile/summary` | Bearer — dashboard counters in one round trip |

## Properties

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/properties` | optional | `q, city, state, type, status, min_price, max_price, bedrooms, bathrooms, amenities, sort, page, per_page` |
| GET | `/properties/featured` | optional | `limit` |
| GET | `/properties/mine` | Bearer | Listings you own |
| GET | `/properties/:idOrSlug` | optional | Accepts either a UUID or a slug |
| POST | `/properties` | landlord/agent/manager | |
| PUT | `/properties/:id` | owner | |
| DELETE | `/properties/:id` | owner | Soft delete |

Search is public: an anonymous caller sees available listings, and a signed-in
landlord additionally sees their own drafts.

## Bookings

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/bookings` | Bearer | As tenant or as landlord |
| POST | `/bookings` | tenant | `property_id`, `start_date`, optional `end_date`, `message` |
| POST | `/bookings/:id/decision` | landlord | `approved` \| `rejected` \| `cancelled`, optional `reason` |

## Maintenance

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/maintenance` | Bearer | `status`, `property_id` |
| POST | `/maintenance` | tenant | Must rent the property |
| PATCH | `/maintenance/:id` | landlord/tenant | Legal transitions only; completed is terminal |

Response targets are published as `response_target_hours`:

| Priority | Target |
| --- | --- |
| emergency | 4 h |
| high | 24 h |
| medium | 72 h |
| low | 168 h |

## Messaging

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/conversations` | Bearer | With `counterpart` and `unread_count` resolved |
| POST | `/conversations` | Bearer | `participant_id`, optional `property_id`, `content` |
| GET | `/conversations/:id/messages` | Bearer | Participant only |
| POST | `/conversations/:id/messages` | Bearer | Participant only |
| POST | `/conversations/:id/read` | Bearer | Participant only |
| GET | `/realtime` (WebSocket) | Bearer | Durable Object hub; not yet used by the browser |

## Documents

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/documents` | Bearer | |
| POST | `/documents/upload-intent` | Bearer | Returns a signed PUT URL and required headers |
| POST | `/documents/:id/complete` | Bearer | Confirms the bytes landed in R2 |
| GET | `/documents/:id/download` | Bearer | Short-lived signed URL |
| DELETE | `/documents/:id` | Bearer | |

Uploads are two-step so files never transit the Worker: the browser PUTs
straight to R2 with a signed URL, then confirms. Abandoned intents are purged by
the nightly cron. Limit 10 MB; PDF, images, spreadsheets, text and Word.

## Agent CRM

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/leads` | agent/manager/admin | |
| GET | `/leads/statistics` | agent/manager/admin | Registered before `/leads/:id` so it is never shadowed |
| POST | `/leads` | agent/manager/admin | |
| PUT | `/leads/:id` | agent/manager/admin | |
| PATCH | `/leads/:id/status` | agent/manager/admin | |
| GET | `/leads/showings` | agent/manager/admin | |
| POST | `/leads/showings` | agent/manager/admin | |
| PATCH | `/leads/showings/:id` | agent/manager/admin | |
| GET | `/leads/commissions` | agent/manager/admin | |
| PATCH | `/leads/commissions/:id` | agent/manager/admin | |

## Roommates

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/roommates/profiles` | Bearer |
| GET | `/roommates/matches` | Bearer — ranked, with reasons |
| GET | `/roommates/profile` | Bearer |
| PUT | `/roommates/profile` | Bearer — upsert |
| POST | `/roommates/applications` | Bearer |
| GET | `/roommates/applications` | Bearer |
| PATCH | `/roommates/applications/:id` | Bearer — accept or decline |

Match score weights: budget 30, lifestyle 22, habits 20, location 18, age 10.
It is deterministic, not a model.

## Vendors

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/vendors` | Bearer — `category`, `q` |
| GET | `/vendors/bookings` | Bearer |
| POST | `/vendors/bookings` | Bearer |
| POST | `/vendors/reviews` | Bearer |
| GET | `/vendors/:id/reviews` | Bearer |

## Notifications

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/notifications` | Bearer |
| GET | `/notifications/unread-count` | Bearer |
| POST | `/notifications/read-all` | Bearer |
| POST | `/notifications/:id/read` | Bearer |

## Administration

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/admin/analytics` | admin | |
| GET | `/admin/users` | admin | `role`, `q`, `page`, `per_page` |
| PATCH | `/admin/users/:id/role` | admin | Cannot change your own role |
| PATCH | `/admin/users/:id/disabled` | admin | Cannot disable yourself |
| GET | `/admin/audit-logs` | admin | |
| DELETE | `/admin/properties/:id` | admin | Moderation |

Every admin action is written to the audit log with actor, action, resource and
IP address.

## Scheduled work

| Schedule | Job |
| --- | --- |
| `17 3 * * *` | Nightly housekeeping: purge expired tokens, abandoned uploads and old notifications |
| `0 8 * * *` | Morning saved-search digest, enqueued rather than sent inline |

Cron jobs are registered in `worker/wrangler.toml` and dispatched in
`worker/src/cron.ts`.
