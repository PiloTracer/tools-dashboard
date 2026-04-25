# Tools Dashboard — session handoff

**Purpose:** Fast resume for the next chat or engineer. Read this first, then `.cursorrules` and `DOCS_TECH_STACK.md` as needed.

**Last aligned:** 2026-04-25 — **Improvement sprint** still tracked in `.claude/plans/20260422_PLAN_application-improvement-priorities.md` when present; see **Recently landed** tables below.

---

## Recently landed (2026-04-25)

| Area | What changed |
|------|----------------|
| **Public i18n (no stale `/app/locales` fetch)** | `front-public/app/entry.client.tsx` — bundles `public/locales/en|es/common.json` via `resources` in `i18next.init`; removed `i18next-http-backend` on the client so nav strings are not stuck on cached JSON. `front-public/tsconfig.json` — `resolveJsonModule: true`. |
| **Public nav + auth UX** | `PublicLayout.tsx` — **Apps** link (`header.nav.appLibrary`), `t()` in render; **hide Register** in header/footer when `useUserStatus().isAuthenticated`. `user-registration` loader — verified sessions redirect to `return_to` or **`/features/app-library`** via `getVerifiedRegistrationSession()` (`front-public/app/utils/user-registration-status.server.ts`). |
| **Back-auth cold start** | `front-public/app/utils/http.server.ts` — `fetchWithTransientRetry`; used by user-status, user-registration config, and `user-registration-status.server.ts`. User-status final failure: one-line `console.warn`. |
| **OAuth launch `redirect_uri`** | `front-public/app/features/app-library/utils/oauth.ts` — **`pickOAuthRedirectUri()`**: match `dev_url` origin, prefer `localhost`/`127.0.0.1`, reject `0.0.0.0`/`::` when alternatives exist; never blindly use `redirect_uris[0]`. |
| **Public API + DB hygiene for bad OAuth hosts** | `back-api/features/app-library/domain.py` — **`sanitize_public_oauth_client()`** strips `0.0.0.0`/`::` callback URIs from list responses. `shared/contracts/app_library/models.py` — **reject** those hosts on **AppCreate** / **AppUpdate**. `back-postgres/schema/011_oauth_redirect_strip_bad_hosts.sql` — removes unusable callback URIs from existing rows when at least one good URI remains. |
| **Bootstrap vs admin** | `008_ecards_app_bootstrap.sql` / `009_rizervox_app_bootstrap.sql` use **`ON CONFLICT DO NOTHING`** for `oauth_clients`, `app_access_rules`, and (Rizervox) sample `user_app_preferences` — **insert-only**: first provision on empty DB; **restarts do not overwrite** admin edits. Duplicate **`seeds/dev/008_cms_app_seed.sql`** removed; Rizervox canonical SQL is **`009` only**. `back-postgres/main.py` still runs all `schema/*.sql` each service start (no ledger). |

**Uncommitted / verify before merge:** ensure `user-registration-status.server.ts` is **tracked** if registration redirect ships; run `011` (or full schema replay) on existing dev DBs so old `0.0.0.0` rows are cleaned.

---

## Postgres / `back-postgres-service` (read before editing app library rows)

- **What runs:** `back-postgres/main.py` → `run_migrations()` executes **all** `back-postgres/schema/*.sql` in **sorted filename order** on **every service start** (not “migrate once per version”).
- **Data bootstrap (2026-04-25):** `008_ecards_app_bootstrap.sql` and `009_rizervox_app_bootstrap.sql` use **`INSERT … ON CONFLICT DO NOTHING`** for default **`ecards_a1b2c3d4`** / **`rizervox_r1z2r3v4`** rows and access rules — **no repo-driven overwrite on restart**; new rows appear only when the row did not exist (e.g. fresh volume). **`011_oauth_redirect_strip_bad_hosts.sql`** still **updates** `redirect_uris` only when unusable hosts (`0.0.0.0`, etc.) are present and a good URI remains (repair; no-op when already clean).
- **Seeds:** `back-postgres/seeds/dev/007_app_library_seed.sql` is **optional / manual**, insert-only aligned with schema; **not** run by `main.py`.
- **Ledger:** long-term improvement is a real migration table so schema DDL is not re-executed blindly each boot; bootstrap policy above already stops data clobber for seeded clients.

---

## Recently landed (2026-04-24)

| Area | What changed |
|------|----------------|
| **App library OAuth bootstrap (Postgres)** | `back-postgres/schema/008_ecards_app_bootstrap.sql` — idempotent upsert for **`ecards_a1b2c3d4`** (metadata + `all_users` access rule); removes legacy **`ecards_app_dev`**. `006_oauth_tables.sql` no longer inserts the old dev row (E‑Cards lives in `008` after app_library columns exist). |
| **Rizervox CMS client** | `back-postgres/schema/009_rizervox_app_bootstrap.sql` — same pattern for **`rizervox_r1z2r3v4`** (`http://localhost:17513`, `https://rizervox.com`, `/oauth/complete` redirects). Dev bootstrap secret same convention as E‑Cards (see migration comments). |
| **Feature metadata** | `front-public/app/features/app-library/feature.yaml` — `external_integrations` lists Rizervox; deployment checklist references bootstrap migrations. |
| **Operator log (code-only)** | `.ai/context/IMPLEMENTATION_LOG_CMS_OAUTH_RIZERVOX.md` — OAuth contract, DB fields, A1–A7 audit vs repo; notes **`front-public/app/routes/oauth.token.tsx`** still has **TODO** for explicit **`client_secret`** verification against DB. |
| **Dev seed** | `back-postgres/seeds/dev/007_app_library_seed.sql` — header notes automatic path is **`008`** (manual seed optional). |

**Expected Rizervox product plan path (not in this checkout):** `.ai/plan/multi-tenant-headless-cms` — add to repo or paste OAuth sections so the implementation log can cite plan IDs.

---

## Recently landed (2026-04-23)

| Area | What changed |
|------|----------------|
| **Public app library auth** | `back-api/features/app-library/api.py` — `get_current_user` no longer returns a mock admin. It calls **`GET {AUTH_SERVICE_URL}/user-registration/status`** with forwarded **`Cookie`**. Verified email only → list apps; no session → **401**; session but unverified → **403**. |
| **front-public app library** | Loader redirects **401** → sign-in, **403** → email verify (`resolvePublicPath`). |
| **User status UI** | `front-public/.../user-status/routes/index.tsx` — pending session returns `user` + `isAuthenticated: false` so header can show “pending verification”. |
| **Client state** | `userStatusStore.ts` — do **not** rehydrate `isAuthenticated` / `user` from `localStorage` (stale “logged in” after server state changed). |
| **Nginx / Remix** | `infra/nginx/default.conf` + `default.prd.conf` — **`location = /`** (dev) and **`location = /app`** preserve **`?$args`** on redirect to `/app/` so Remix **`?_data=`** client loads are not stripped (**fixes post-logout / navigation `TypeError: Failed to fetch`**). |
| **Logout** | `front-public/.../user-logout/routes/index.tsx` — redirect to **`resolvePublicHomeUrl()`** (`/app/`); forward **all** `Set-Cookie` from back-auth via `getAllSetCookieHeaders` (`front-public/app/utils/setCookie.server.ts`). |
| **back-auth email** | `back-auth/services/email.py` — no SMTP **AUTH** to **Mailhog** (`MAIL_HOST=mailhog`); skip login when username empty; avoids `SMTPServerDisconnected` with leftover SendGrid creds in `.env`. |
| **back-auth settings** | `back-auth/core/config.py` — **no** `env_file=".env"`; settings from **process env** (Compose injects repo-root `.env`). |
| **Seaweed docs** | `seaweedfs-config/README.md` — mini-tutorial + S3 gateway vs `security.toml`. |
| **`.env*`** | Four root files aligned (same keys / line layout); only root `.env*` used. |

---

## Improvement plan (active)

| Item | Location |
|------|----------|
| **Three-priority roadmap** | `.claude/plans/20260422_PLAN_application-improvement-priorities.md` |
| **Feature maps / product features** | `.claude/features/*`, index `.claude/FEATURES_INDEX.md` |
| **Conventions (plans, fixes, ADRs)** | `.claude/CONVENTIONS.md` |

**Note:** `.claude/` may be **gitignored** in this repo; if another machine does not have these files, copy them from a machine that does or remove `.claude/` from `.gitignore` for that subtree only (team policy).

---

## Next session (resume from 2026-04-25)

**Commit hygiene:** Stage any still-untracked files needed for the above (e.g. `user-registration-status.server.ts`).

**Postgres bootstrap:** Bootstrapped E‑Cards / Rizervox rows are **insert-only** (`DO NOTHING` on conflict) — see **Postgres / back-postgres-service**.

**Rizervox / CMS OAuth:** Confirm `.ai/plan/multi-tenant-headless-cms` is present or sync plan excerpt; align `009` / `feature.yaml` if plan specifies different hosts, scopes, or callback paths. Rizervox app env must use **`http://localhost:17513`** (not `0.0.0.0:3000`) for post-callback redirects. Optionally implement **`client_secret`** bcrypt check on token exchange (`oauth.token.tsx` TODO) via `back-api` or `back-auth`.

**Priority 1 (security + sessions + edge)** — still active; work in **small PRs**; keep `.env.prd` secrets out of chat. Evidence before merge: targeted tests + manual smoke on `dev` then `prd` preflight.

### 1A — Admin session (front-admin)

| Step | Where to work |
|------|----------------|
| Replace ad-hoc `admin_session` cookie with **signed server session** (Remix `createCookieSessionStorage` or existing project pattern). | `front-admin/app/features/admin-signin/routes/index.tsx` (action sets cookie today), new `*.server.ts` if needed |
| **Validate JWT** (or opaque session) on protected admin loaders; redirect to sign-in if invalid/expired. | `front-admin/app/root.tsx`, `app/components/layout/AdminLayout.tsx`, loaders on `app/routes/admin.*` |
| Keep **CSRF** on mutating forms. | `front-admin/app/utils/admin-csrf.server.ts` (already integrated on sign-in) |

**Auth source today:** sign-in action calls `POST {AUTH_API_URL}/email/login` (see `index.tsx`); role gate `admin`.

### 1B — Public session (back-auth + front-public)

| Step | Where to work |
|------|----------------|
| Audit session cookie flags: `Secure`, `SameSite`, `Path`, `Domain`, alignment with **TLS termination** and `X-Forwarded-Proto`. | `back-auth/core/config.py` (or settings module), registration/logout handlers in `back-auth/features/user-registration/api.py` |
| Confirm **front-public** proxies and `fetch` URLs use the same base URL model as nginx (see **API routing** below). | `front-public/app/utils/publicPath.server.ts`, env usage in routes |

### 1C — Resource API hardening (back-api)

| Step | Where to work |
|------|----------------|
| Remove debug **`print`** paths; use `logging` with **no token / PII** in log lines. | `back-api/features/users/api.py` (`GET /users/me`, Bearer → `back-auth` `/internal/oauth/validate-token`) — **still TODO** |
| Service-local map | `back-api/features/users/feature.yaml` |

### 1D — Edge / API URL mental model (nginx + callers)

**Two call patterns exist; do not conflate them.**

1. **Browser → nginx → back-api:** `infra/nginx/default.conf` and `default.prd.conf` use `location /api/` with `proxy_pass http://back-api:8000/;` — the URI forwarded to FastAPI is **`/api`-stripped** (e.g. browser `/api/users/me` → upstream path `/users/me`). Routers with prefix **`/users`** match; verify each router against this rule.
2. **Server-to-server (Remix loader → back-api in Docker):** code often uses `BACKEND_API_URL` / `http://back-api:8000` and may call **`/api/...`** paths directly on the container. That is valid **only** if FastAPI routes are registered with that prefix (e.g. auto-auth `APIRouter(prefix="/api")`).

**Remix + `/app` redirects (2026-04-23):** `location = /` and `location = /app` must **preserve the query string** when redirecting to `/app/` (`if ($args = '') … else … /app/?$args`). A bare `return 301 /app/` **drops** `?_data=…` and breaks client loader fetches (`TypeError: Failed to fetch`).

**Priority 1D deliverable:** After you verify with `curl`/browser against `dev` and `prd`, document the **canonical** external vs internal URL table in this HANDOFF (one subsection) and fix any **documented** mismatch (nginx rewrite vs router prefix — pick one strategy per environment).

---

## Priority 1 — definition of done (first slice)

Use this as the **exit checklist** for the first mergeable chunk (can be 1A only, then follow-ups):

- [ ] No `print`-based debug on auth-adjacent `back-api` paths you touched; tokens never logged.
- [ ] Admin mutating flows that you change still enforce CSRF where applicable.
- [ ] Session cookies respect `X-Forwarded-Proto` in deployed TLS setups (or document explicit exception for local HTTP).
- [ ] This HANDOFF subsection **API routing** updated with measured behavior (not assumed).
- [ ] `docker compose ... config` / `./bin/start.sh prd preflight` still clean after changes touching compose (if any).

---

## Production target

| Item | Value |
|------|--------|
| Public app URL | `https://tools.aiepic.app` |
| Compose file | `docker-compose.prd.yml` |
| Env file (not in git) | `.env.prd` (required for `prd`; use `.env.prd.example` as template) |
| Nginx config (in repo) | `infra/nginx/default.prd.conf` |
| Host reverse-proxy example | `infra/nginx/system-port80-to-docker-8082.example.conf` |

WebSockets: clients use `wss://tools.aiepic.app/ws/` when the site is HTTPS (same host as the app; no extra public subdomain required for WS).

---

## Naming convention (important)

- **Production file suffix is `prd`, not `prod`:** e.g. `Dockerfile.prd`, `docker-compose.prd.yml`, `.env.prd`, `default.prd.conf`, `README.prd.md`.
- `bin/start.sh` still accepts `prod` / `production` as **CLI aliases** that map to `prd` — convenience only, not filenames.

---

## How to run the stack

```bash
# Development (default compose + .env)
./bin/start.sh dev up-build

# Production-style build/validate (uses .env.prd)
./bin/start.sh prd preflight    # compose config + placeholder warnings
./bin/start.sh prd build        # images only
./bin/start.sh prd up-build     # build + up

# Raw compose (prd)
docker compose -f docker-compose.prd.yml --env-file .env.prd config
docker compose -f docker-compose.prd.yml --env-file .env.prd build
```

**Staging:** `stg` + `.env.stg` if present (same script pattern as `prd`).

---

## Services (compose mental model)

| Compose service | Role |
|-----------------|------|
| `nginx-proxy` | Entry reverse proxy |
| `front-public` | Public Remix (`/app`) |
| `front-admin` | Admin Remix (`/admin`) |
| `back-api` | Main FastAPI |
| `back-auth` | Auth FastAPI |
| `back-websockets` | WebSockets |
| `back-workers` | Celery |
| `feature-registry` | Feature registry API |
| `postgresql`, `redis`, `cassandra` | Data layer |
| `seaweedfs` | S3-compatible object storage |
| `back-postgres-service`, `back-cassandra` | DB tooling / migrations (per compose) |

`back-api` image build context is **repo root** (`docker-compose.prd.yml`) so `shared/` is included — see `back-api/Dockerfile.prd`.

---

## Environment parity

All of these share **the same key order and line count** for diff-by-line integrity checks:

- `.env.dev.example`
- `.env.prd.example`
- `.env` (local dev; gitignored)
- `.env.prd` (production; gitignored)

Newer keys include `REDIS_PASSWORD`, `SEAWEED_S3_ACCESS_KEY`, `SEAWEED_S3_SECRET_KEY`, `TD_PUBLIC_BASE_URL`, `OAUTH_CONSENT_SERVICE_SECRET`, etc. — see `.env.prd.example` comments.

---

## Security / ops checklist (before real traffic)

1. Replace every `CHANGE_ME_*` in `.env.prd` (JWT, Postgres password + all DB URLs, Redis password + Redis URLs, default admin password, OAuth consent secret, etc.).
2. Align Seaweed S3 keys: env vars **and** `seaweedfs-config/s3-config.json`; rotate after clone.
3. SMTP and Google OAuth: real values; redirect URI must match Google Console (full URL, no stray query params).
4. **HSTS** and TLS: terminate HTTPS **in front of** the in-container nginx (CDN/LB or host nginx); internal compose nginx is plain HTTP on the mapped port — see `infra/nginx/README.prd.md`.

---

## Recent repo decisions (high signal)

- Production Dockerfiles are **`Dockerfile.prd`** (multi-stage Node + Python patterns; non-root users where applicable).
- Per-service **`.dockerignore`** under each service build context; `front-*` ignores expanded to avoid baking `.env*` into images.
- Python images: `PYTHONDONTWRITEBYTECODE`, `PYTHONUNBUFFERED`, pip no-cache in build stages; `EXPOSE` on API services.
- `docker-compose.prd.yml`: healthchecks, `depends_on` with `service_healthy`, Redis optional `requirepass` via `REDIS_PASSWORD`, structured logging anchor (`x-logging`).
- Admin sign-in: double-submit CSRF — `front-admin/app/utils/admin-csrf.server.ts` + route integration.
- Seaweed credentials read from env in Python init paths (`back-api` scripts/service, `seaweedfs/create-buckets.py`).
- **Seaweed access:** `seaweedfs-config/README.md` (S3 gateway vs `security.toml`); dev S3 host port **18333** (not 8333 on host).
- **Classic signup email:** dev uses **Mailhog** — messages appear in Mailhog UI only, not real inboxes; `MAIL_HOST=mailhog` + empty SMTP user/pass (or code path that skips AUTH for Mailhog). See `back-auth/services/email.py`.
- `package-lock.json` must stay in sync with `package.json` for `npm ci` in `Dockerfile.prd` builds.

---

## Verification commands (evidence)

```bash
docker compose -f docker-compose.prd.yml --env-file .env.prd config --quiet
./bin/start.sh prd preflight
docker compose -f docker-compose.prd.yml --env-file .env.prd build
```

Preflight **warns** on placeholder secrets in `.env.prd` — expected until operators replace them.

---

## Cursor / `.cursorrules` (how “memory” works)

- **`.cursorrules` is a file in the repo.** Cursor loads workspace rules from it when you work in this project; it is **not** stored only inside a single chat’s memory. New chats still see it as long as the file is present.
- For long threads, the model may still lose earlier message detail — **this file + `DOCS_TECH_STACK.md`** are the durable “memory” for procedure and architecture.
- Optional: add rules under `.cursor/rules/` for file-scoped guidance (separate from `.cursorrules`).

---

## Where to look next (common tasks)

| Task | Start here |
|------|------------|
| Stack / ports / tech overview | `DOCS_TECH_STACK.md` |
| **Improvement roadmap (P1–P3)** | `.claude/plans/20260422_PLAN_application-improvement-priorities.md` |
| Feature conventions | `.claude/CONVENTIONS.md`, `.claude/FEATURE_STANDARD.md` |
| Feature index | `.claude/FEATURES_INDEX.md` |
| Nginx / TLS / WS notes | `infra/nginx/README.prd.md`, `infra/nginx/default.prd.conf`, `default.conf` (dev — **query-preserving** `/` and `/app` redirects) |
| Start script behavior | `bin/start.sh` |
| Prod compose edits | `docker-compose.prd.yml` |
| Public path / base URL logic | `front-public/app/utils/publicPath.server.ts` |
| App library OAuth clients (Postgres bootstrap) | `back-postgres/schema/008_ecards_app_bootstrap.sql`, `009_rizervox_app_bootstrap.sql`, **`011_oauth_redirect_strip_bad_hosts.sql`** |
| Rizervox CMS OAuth contract (code-only) | `.ai/context/IMPLEMENTATION_LOG_CMS_OAUTH_RIZERVOX.md` |
| Public OAuth launch / `redirect_uri` selection | `front-public/app/features/app-library/utils/oauth.ts` (`pickOAuthRedirectUri`) |
| App library public JSON hygiene | `back-api/features/app-library/domain.py` (`sanitize_public_oauth_client`) |
| App create/update validation (redirect / dev URL hosts) | `shared/contracts/app_library/models.py` |
| Verified-user skip registration | `front-public/app/utils/user-registration-status.server.ts`, `user-registration/routes/index.tsx` loader |

---

## Open / follow-up (not blocking compose build)

- **Priority 1 (active):** remaining 1A admin session hardening, 1B cookie audit, 1C remove `print` / logging on `back-api` users path; expand **API routing** table with measured `curl` matrix after any nginx/router change.
- **OAuth:** explicit **`client_secret`** verification at token endpoint still **TODO** in `front-public/app/routes/oauth.token.tsx`; Rizervox operator doc: `.ai/context/IMPLEMENTATION_LOG_CMS_OAUTH_RIZERVOX.md`.
- **Postgres migrations ledger:** `main.py` still replays every `schema/*.sql` each boot — consider Flyway/Alembic-style tracking for DDL-only files; bootstrap **data** for seeded clients is now insert-only (`DO NOTHING`).
- **Rizervox plan:** add `.ai/plan/multi-tenant-headless-cms` to this repo (or link) so bootstrap checklist can match product spec.
- `tmp/errors.txt` audit may still list CI, digest-pinned base images, nginx `resolver`, Python `requirements.txt` pinning breadth — triage as needed.
- Operator: real secrets, DNS, TLS cert, and external LB headers (`X-Forwarded-Proto`) for correct secure cookies and redirects.

---

## Updating this file

After a significant session, refresh **Production target**, **Improvement plan / Priority 1 checklist**, **Recent repo decisions**, and **Open / follow-up** so the next run starts in one skim.
