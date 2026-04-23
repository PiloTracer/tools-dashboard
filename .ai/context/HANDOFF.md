# Tools Dashboard — session handoff

**Purpose:** Fast resume for the next chat or engineer. Read this first, then `.cursorrules` and `DOCS_TECH_STACK.md` as needed.

**Last aligned:** 2026-04-22 — **Improvement sprint prep:** cross-cutting plan lives at `.claude/plans/20260422_PLAN_application-improvement-priorities.md` (Priority 1 starter checklist below). **Next session:** begin Priority 1 execution (2026-04-23 or whenever you pick up the sprint).

---

## Improvement plan (active)

| Item | Location |
|------|----------|
| **Three-priority roadmap** | `.claude/plans/20260422_PLAN_application-improvement-priorities.md` |
| **Feature maps / product features** | `.claude/features/*`, index `.claude/FEATURES_INDEX.md` |
| **Conventions (plans, fixes, ADRs)** | `.claude/CONVENTIONS.md` |

**Note:** `.claude/` may be **gitignored** in this repo; if another machine does not have these files, copy them from a machine that does or remove `.claude/` from `.gitignore` for that subtree only (team policy).

---

## Tomorrow: start Priority 1 (security + sessions + edge)

Work in **small PRs**; keep `.env.prd` secrets out of chat. Evidence before merge: targeted tests + manual smoke on `dev` then `prd` preflight.

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
| Remove debug **`print`** paths; use `logging` with **no token / PII** in log lines. | `back-api/features/users/api.py` (`GET /users/me`, Bearer → `back-auth` `/internal/oauth/validate-token`) |
| Service-local map | `back-api/features/users/feature.yaml` |

### 1D — Edge / API URL mental model (nginx + callers)

**Two call patterns exist; do not conflate them.**

1. **Browser → nginx → back-api:** `infra/nginx/default.conf` and `default.prd.conf` use `location /api/` with `proxy_pass http://back-api:8000/;` — the URI forwarded to FastAPI is **`/api`-stripped** (e.g. browser `/api/users/me` → upstream path `/users/me`). Routers with prefix **`/users`** match; verify each router against this rule.
2. **Server-to-server (Remix loader → back-api in Docker):** code often uses `BACKEND_API_URL` / `http://back-api:8000` and may call **`/api/...`** paths directly on the container. That is valid **only** if FastAPI routes are registered with that prefix (e.g. auto-auth `APIRouter(prefix="/api")`).

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
| Nginx / TLS / WS notes | `infra/nginx/README.prd.md`, `infra/nginx/default.prd.conf` |
| Start script behavior | `bin/start.sh` |
| Prod compose edits | `docker-compose.prd.yml` |
| Public path / base URL logic | `front-public/app/utils/publicPath.server.ts` |

---

## Open / follow-up (not blocking compose build)

- **Priority 1 (active):** execute checklist above; update **API routing** subsection with verified paths after nginx vs in-cluster testing.
- `tmp/errors.txt` audit may still list CI, digest-pinned base images, nginx `resolver`, default `location /`, Python `requirements.txt` pinning breadth — triage as needed.
- Operator: real secrets, DNS, TLS cert, and external LB headers (`X-Forwarded-Proto`) for correct secure cookies and redirects.

---

## Updating this file

After a significant session, refresh **Production target**, **Improvement plan / Priority 1 checklist**, **Recent repo decisions**, and **Open / follow-up** so the next run starts in one skim.
