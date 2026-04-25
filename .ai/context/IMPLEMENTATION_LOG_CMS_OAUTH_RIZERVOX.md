# Rizervox CMS — OAuth seed and contract (tools-dashboard, code-only)

This document is derived **only from this repository’s source** (no running stack assumed). It records what tools-dashboard implements for the Rizervox OAuth client and what is still unknown because the product plan directory is missing from this checkout.

---

## Plan reference (expected vs present)

**Expected location (per team):** `.ai/plan/multi-tenant-headless-cms`

**Status in this workspace:** That path **does not exist** here (no files under `.ai/plan/`). Nothing in this log can be traced to sections of that plan until the folder is added or pasted.

**If you add the plan, we would reconcile:** tenant-specific redirect URIs, extra environments (e.g. staging), scope list changes, branding URLs, whether `client_id` should follow a plan-defined slug, and any Cassandra or non-Postgres seed requirements. None of that appears in code today beyond the Postgres + feature YAML described below.

---

## Postgres: Rizervox OAuth client (insert-only bootstrap)

**File:** `back-postgres/schema/009_rizervox_app_bootstrap.sql` (canonical; duplicate `seeds/dev/008_cms_app_seed.sql` **removed**).

**How it runs:** `back-postgres/main.py` loads every `schema/*.sql` in sorted name order after waiting for the `users` table (`run_migrations`). `009_*` runs after `006_oauth_tables.sql`, `007_app_library_tables.sql`, and `008_ecards_app_bootstrap.sql`.

**Behavior (2026-04-25):**

1. **`oauth_clients`**: `INSERT … ON CONFLICT (client_id) DO NOTHING` — first provision only; **restarts do not overwrite** admin edits.
2. **`app_access_rules`**: `INSERT … ON CONFLICT (app_id) DO NOTHING` for `all_users` when the Rizervox row exists.
3. **`user_app_preferences`** (optional dev sample): insert-only `DO NOTHING` on `(user_id, app_client_id)` for `admin@example.com` + `rizervox_r1z2r3v4`.
4. Plaintext dev secret **documented in SQL comments only:** `dev_secret_do_not_use_in_production` (bcrypt hash matches E‑Cards bootstrap in `008_ecards_app_bootstrap.sql`).

**Row values inserted when the row is absent (authoritative defaults for new envs):**

| Column | Value |
|--------|--------|
| `client_id` | `rizervox_r1z2r3v4` |
| `client_name` | `Rizervox` |
| `description` | `CMS + SEO + agentic` |
| `logo_url` | `/app/app-library-logos/rizervox.svg` (same-origin asset via nginx `app-library-logos` mapping) |
| `dev_url` | `http://localhost:17513` |
| `prod_url` | `https://rizervox.com` |
| `redirect_uris` | `http://localhost:17513/oauth/complete`, `https://rizervox.com/oauth/complete` (order: dev first) |
| `allowed_scopes` | `profile`, `email`, `subscription` |
| `is_active` | `true` |
| `created_by` | `users.id` for `admin@example.com` if that row exists; else `NULL` until a later run backfills |

---

## Feature metadata (non-authoritative for OAuth protocol)

**File:** `front-public/app/features/app-library/feature.yaml`  
**Block:** `external_integrations` entry `Rizervox` with `url_dev`, `url_prod`, `client_id`, `description`.

This is documentation for humans/operators; the **authorization server and DB** do not read this file.

---

## HTTP contract (Rizervox → tools-dashboard), from front-public code

**Ingress (nginx):** `infra/nginx/default.conf` routes host-root **`/oauth/`** and **`/.well-known/`** to `front-public` (not under `/app/`). So a browser or server using the **site origin** uses:

- **Authorization:** `{origin}/oauth/authorize`
- **Token:** `{origin}/oauth/token` (POST)
- **Discovery:** `{origin}/.well-known/openid-configuration`

**Discovery JSON** (`front-public/app/routes/.well-known.openid-configuration.tsx`): `issuer` and endpoints use `request` origin (`url.protocol` + `//` + `url.host`). Advertises `authorization_endpoint`, `token_endpoint`, `jwks_uri`, `grant_types_supported` (`authorization_code`, `refresh_token`), `token_endpoint_auth_methods_supported`: **`client_secret_post`**, `scopes_supported`: **`profile`**, **`email`**, **`subscription`**, `code_challenge_methods_supported`: **`S256`**.

**Token action** (`front-public/app/routes/oauth.token.tsx`): Reads `application/x-www-form-urlencoded` form fields: `grant_type`, `code`, `redirect_uri`, `client_id`, `client_secret`, optional `code_verifier`, and for refresh `refresh_token`. Rejects missing `client_id` or `client_secret`. Calls `back-auth` at `AUTH_API_URL` (default `http://back-auth:8001`) for `/internal/oauth/validate-code` and issue/refresh paths. **Code comment:** explicit verification of `client_secret` against Postgres is **TODO** (credentials required but bcrypt check not wired in this file).

**App Library launch URL** (`front-public/app/features/app-library/utils/oauth.ts`): Builds authorize URL as `window.location.origin + '/oauth/authorize'`. **`redirect_uri`** is chosen by **`pickOAuthRedirectUri()`** (match `dev_url` origin, prefer `localhost`/`127.0.0.1`, deprioritize `0.0.0.0`/`::` when alternatives exist) — **not** blindly `redirect_uris[0]` (no PKCE in that builder path).

**Public API responses** (`back-api/features/app-library/domain.py`): **`sanitize_public_oauth_client()`** removes `redirect_uris` entries whose host is `0.0.0.0` / `::` before JSON reaches the browser (when at least one usable URI remains).

**One-shot DB cleanup** (`back-postgres/schema/011_oauth_redirect_strip_bad_hosts.sql`): Strips unusable callback hosts from existing `oauth_clients.redirect_uris` when a good URI remains (runs with other `schema/*.sql` on each `back-postgres-service` migration pass).

**Create/update validation** (`shared/contracts/app_library/models.py`): **AppCreate** / **AppUpdate** reject `dev_url`, `prod_url`, and `redirect_uris` whose host is `0.0.0.0` or IPv6 all-interfaces style (`::`, etc.).

**Rizervox app should configure:**

| Setting | Value (from code + `009`) |
|--------|---------------------------|
| OAuth client ID | `rizervox_r1z2r3v4` |
| OAuth client secret (bootstrap) | `dev_secret_do_not_use_in_production` |
| Redirect callback (dev) | `http://localhost:17513/oauth/complete` |
| Redirect callback (prod) | `https://rizervox.com/oauth/complete` |
| Authorize URL | `{dashboard_origin}/oauth/authorize` |
| Token URL | `{dashboard_origin}/oauth/token` |
| Token endpoint auth | `client_secret_post` (form body) |
| Scopes to request | `profile email subscription` (space-separated) |

`{dashboard_origin}` is whatever host serves nginx with those locations (e.g. `https://tools.aiepic.app` in production per `HANDOFF.md`); not hardcoded in Rizervox migration.

---

## Implementation checklist (code audit, A1–A7)

Mapped to **what exists in git** for Rizervox CMS OAuth seeding in tools-dashboard. Not claimed equal to ~app_03 without the plan file.

| ID | Requirement (code-derived) | Status |
|----|---------------------------|--------|
| A1 | Rizervox bootstrap lives in `schema/*.sql` and runs after app_library DDL (`007` before `009`). | Done — `009_rizervox_app_bootstrap.sql` ordering |
| A2 | `oauth_clients` row: stable `client_id`, name, description, URLs, scopes, active flag. | Done — see table above |
| A3 | `redirect_uris` list includes dev and prod `/oauth/complete`. | Done — `009` array |
| A4 | `allowed_scopes` includes `profile`, `email`, `subscription` (matches discovery `scopes_supported`). | Done — `009` + `.well-known.openid-configuration.tsx` |
| A5 | `app_access_rules` row with `all_users` for Rizervox app UUID, idempotent. | Done — second statement in `009` |
| A6 | Operator-facing feature list includes Rizervox client id and URLs. | Done — `feature.yaml` `external_integrations` |
| A7 | OAuth entry points and token method documented for an external CMS (this file + nginx + routes). | Done — sections above |

---

## What we need from you next

1. **Add** `.ai/plan/multi-tenant-headless-cms` to this repo (or paste the OAuth / tenant / redirect sections), so this log can cite plan section IDs and any deltas (e.g. extra redirect URIs, staging host, scope changes).
2. **Confirm** Rizervox still uses `http://localhost:17513` and `https://rizervox.com` and `/oauth/complete` paths; if the plan specifies different ports or paths, `009` and `feature.yaml` must be updated together.
3. **Migration ledger:** `main.py` still executes every `schema/*.sql` each boot — add versioned migration tracking for DDL if re-running raw files becomes a problem (bootstrap **data** for seeded clients is now insert-only).
