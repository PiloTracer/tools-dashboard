# Application improvement plan — three priorities

**Plan file:** `.ai/plans/20260422_PLAN_application-improvement-priorities.md`  
**Naming:** `YYYYMMDD` prefix for sortable filenames; slug describes scope.  
**Scope:** Cross-cutting improvements for Tools Dashboard (compose: `front-public`, `front-admin`, `back-api`, `back-auth`, `nginx-proxy`, `back-workers`, `back-websockets`, `feature-registry`).  
**Handoff:** `.ai/context/HANDOFF.md` — **read “Improvement plan” and “Tomorrow: start Priority 1”** before coding; keep HANDOFF in sync after each merge.

**Execution order (unchanged):** Priority 1 → Priority 3 → Priority 2 (see rationale at end).

---

## Status (living document)

| Priority | Status | Next concrete output |
|----------|--------|----------------------|
| **1** Security / sessions / edge | **Ready to start** — HANDOFF lists file-level starter tasks | First PR: admin session **or** `/users/me` logging + HANDOFF API routing verification table |
| **2** Scaffolds | Planned | ADR or one-pager per service: ship MVP vs optional compose |
| **3** CI / observability | Planned | CI job skeleton + one smoke test |

---

## Priority 1 — Security and session hardening (auth + edge)

**Goal:** Remove “demo-shaped” behavior from authentication paths and align cookies, tokens, and proxies with production expectations.

**Rationale:** Admin sign-in uses short-lived patterns and TODOs around secure session storage; OAuth and API traffic depend on consistent base URLs and validation. Reducing debug logging and tightening validation lowers incident risk.

### Workstreams (same as before — detail added for execution)

#### 1. Admin session (`front-admin`)

- Replace ad-hoc `admin_session` cookie with **signed server session** (Remix `createCookieSessionStorage` or team-standard equivalent).
- **Validate** access/refresh or opaque session on **protected loaders**; redirect to `/admin/features/admin-signin` when missing/invalid.
- **CSRF:** keep double-submit token on all state-changing admin forms (extend from sign-in to other mutations as you touch them).

**Primary files:** `front-admin/app/features/admin-signin/routes/index.tsx`, `front-admin/app/utils/admin-csrf.server.ts`, `front-admin/app/root.tsx`, `app/components/layout/AdminLayout.tsx`, routes under `app/routes/admin.*`.

**Acceptance (slice):** With valid session, admin index loads; after logout or token tamper, user cannot access admin API proxies without re-auth.

#### 2. Public session (`back-auth` + `front-public`)

- Audit registration/session cookies: `Secure`, `SameSite`, `Path`, `Domain`, interaction with **`X-Forwarded-Proto`** when TLS terminates at edge.
- Align `front-public` server `fetch` base URLs with nginx public paths (see HANDOFF **API routing**).

**Primary files:** `back-auth/core/config.py` (settings), `back-auth/features/user-registration/api.py`, `front-public/app/utils/publicPath.server.ts`.

**Acceptance (slice):** Document expected cookie behavior for `dev` (HTTP) vs `prd` (HTTPS) in HANDOFF; no regression on login/logout happy path.

#### 3. Resource APIs (`back-api`)

- **`back-api/features/users/api.py`:** replace `print` debug with `logging`; never log full `Authorization` or token bodies; consistent 401 + `WWW-Authenticate: Bearer` on failures.

**Acceptance (slice):** Grep shows no `print` in that module for request lifecycle; logs usable in staging without secret leakage.

#### 4. Edge / API URL mental model (`nginx` + code)

- **Verify** (do not assume): browser `https://host/api/...` through `location /api/` + `proxy_pass http://back-api:8000/;` vs in-container `http://back-api:8000/api/...` used by Remix loaders.
- **Deliverable:** Table in **HANDOFF** documenting which routers expect which path shape; fix nginx **or** router prefix **or** caller URLs so one story holds per environment.

**Primary files:** `infra/nginx/default.conf`, `infra/nginx/default.prd.conf`, `back-api/main.py` (router include order), feature routers with `prefix="/api"` vs `prefix="/users"` etc.

**Acceptance (slice):** At least one documented `curl` for public API path and one for in-cluster path, both returning expected status on `dev`.

### Services affected

`front-admin`, `front-public`, `back-auth`, `back-api`, `nginx-proxy`.

### Success signals (Priority 1 complete — program level)

- No raw token or PII in application logs for touched paths.
- Admin routes require verified server-side session (not cookie presence alone).
- Short penetration checklist (CSRF, cookie flags, session fixation) documented and passing for agreed scope.
- HANDOFF **API routing** subsection filled with **measured** behavior.

### Risks

- Cookie domain / `Secure` changes can break local HTTP dev — gate with env (`NODE_ENV`, custom `SESSION_SECURE=0` in dev only) and document in `.env.*.example`.

### Suggested PR sequence (Priority 1)

1. **PR1 — `back-api` users logging** (low coupling, immediate risk reduction).  
2. **PR2 — Admin Remix session + loader guards** (highest user trust).  
3. **PR3 — Public cookie / settings audit** (coordinate with ops for `prd`).  
4. **PR4 — Nginx + caller URL reconciliation** (after evidence from PR1–3 smoke tests).

---

## Priority 2 — Complete or intentionally retire scaffold services

**Goal:** Every compose service either delivers a minimal contract (health + one real capability) or is marked optional in compose/docs so operators are not misled.

**Rationale:** `feature-registry`, `back-websockets`, and `back-workers` are mostly placeholders; admin `task-scheduler` is UI-only without `back-api` scheduling.

**Approach:** (unchanged — pick MVP vs optional per service)

1. Feature registry: read APIs + Postgres **or** remove from default `prd` compose until MVP.  
2. WebSockets: auth + Redis MVP per `back-websockets/CONTEXT.md`.  
3. Workers: register Celery tasks from `back-workers/tasks/*`.  
4. Admin scheduling: wire UI to API + workers **or** relabel UI as “planned”.

**Handoff:** When a service ships or is demoted, add one line to **HANDOFF** “Services” table footnote (what works in `prd`).

**Services affected:** `feature-registry`, `back-websockets`, `back-workers`, `back-api`, `front-admin`, `redis`, optionally `postgresql`.

**Success signals:** HANDOFF states shippable vs optional per scaffold; compose matches.

**Risks:** Scope creep — MVP boundaries per ADR.

---

## Priority 3 — Reliability, observability, and automated verification

**Goal:** Regressions visible before deploy; faster production diagnosis.

**Rationale:** Thin automated tests; debug noise; CI should encode “must not break auth”.

**Approach:** (unchanged)

1. CI: `back-api` / `back-auth` tests, TS typecheck for both Remix apps.  
2. Smoke: Playwright or `curl` health + one registration/OAuth stub path.  
3. Observability: structured logs + redaction rules for `Authorization`.  
4. Data: migration checklist; optional contract tests vs `shared/contracts`.

**Services affected:** All app services; CI.

**Success signals:** Default branch CI green; logs answer “what release broke X?” quickly.

**Risks:** Flaky E2E — prefer compose-based CI.

---

## Rollback (cross-cutting)

- Ship Priority 1 behind feature flags or env toggles where possible.
- Priorities 2 and 3 land as incremental PRs per service.

---

## Suggested order of execution (summary)

1. **Priority 1** — highest user trust impact; HANDOFF is prepped with starter checklist.  
2. **Priority 3** — protects refactors once P1 first slice merges.  
3. **Priority 2** — largest surface; sequence by business need (registry → workers → websockets → admin scheduler).

---

## Tomorrow checklist (copy into issue / PR description)

- [ ] Read `.ai/context/HANDOFF.md` (Improvement plan + Priority 1 sections).  
- [ ] Open `.ai/plans/20260422_PLAN_application-improvement-priorities.md` (this file).  
- [ ] Pick **PR1** (`users` logging) or **PR2** (admin session) — do not mix in one PR unless trivial.  
- [ ] Run `./bin/start.sh dev up-build` (or existing dev habit) before and after.  
- [ ] Update HANDOFF **API routing** table after any nginx or caller URL change.  
- [ ] Refresh HANDOFF **Last aligned** date when you finish the session.
