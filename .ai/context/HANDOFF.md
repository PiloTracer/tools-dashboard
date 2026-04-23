# Tools Dashboard — session handoff

**Purpose:** Fast resume for the next chat or engineer. Read this first, then `.cursorrules` and `DOCS_TECH_STACK.md` as needed.

**Last aligned:** 2026-04-22 (repo state: production compose + `Dockerfile.prd` naming; unified `.env*` key order.)

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
| Feature conventions | `.claude/CONVENTIONS.md`, `.claude/FEATURE_STANDARD.md` |
| Nginx / TLS / WS notes | `infra/nginx/README.prd.md`, `infra/nginx/default.prd.conf` |
| Start script behavior | `bin/start.sh` |
| Prod compose edits | `docker-compose.prd.yml` |
| Public path / base URL logic | `front-public/app/utils/publicPath.server.ts` |

---

## Open / follow-up (not blocking compose build)

- `tmp/errors.txt` audit may still list CI, digest-pinned base images, nginx `resolver`, default `location /`, Python `requirements.txt` pinning breadth — triage as needed.
- Operator: real secrets, DNS, TLS cert, and external LB headers (`X-Forwarded-Proto`) for correct secure cookies and redirects.

---

## Updating this file

After a significant session, refresh **Production target**, **Recent repo decisions**, and **Open / follow-up** so the next run starts in one skim.
