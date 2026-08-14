# NEXT - planning backlog

**Updated:** 2026-07-28

---

## Done

| Item | Artifact |
|------|----------|
| Reachability + email/placeholder cleanup (front-public) | Reliable availability badge: 3-retry probe + server-side `/app/api/reachability` fallback (loopback→host gateway), 15s re-check; `support@tools-dashboard.io` removed from all public pages; user-subscription placeholder hidden (302 → app library) + `/app/*` 404 catch-all; pricing nav removed — **2026-08-14** |
| Client-app roles (appsuper/appglobal) | Approved SPEC `.work/features/app-roles/20260811-SPEC.md`; migration `014_app_user_roles.sql`; 6 platform-admin endpoints; back-auth `app_roles` claim + `validate-token` field + refresh fix; front-admin appsuper + Client-app roles cards; 14 new tests (19+4 green); smoke 4/4 — **2026-08-11** |
| Admin app-library Access tab UI | Access tab editor (`only_specified`, `all_except`, tiers, user picker, server search); real `user_subscriptions` tier lookup; tab URL persistence; smoke 4/4 — **2026-07-28** |
| Admin user-role assignment | `back-api/features/user-management/domain.py` role validation + `DEFAULT_ROLE_PERMISSIONS` + `resolve_role_permissions`; `front-admin` role card UI + `admin.api.users.$userId.role.tsx` PATCH proxy; backend tests 3/3; en/es locales; **2026-07-28** |
| i18n verification + fixes (last-12h changes) | `a5b8332` + copy commit — getFixedT raw-key fix (both apps), 0-based Trans tags, TLS-safe redirects, plain `i18next` cookie persistence landing↔apps, landing switcher guard, nginx `/health`; smoke 4/4 — **2026-07-25** |
| Portal home copy rewrite | Template marketing text → product-accurate copy (en/es); feature tile 3 repointed to app library — **2026-07-25** |
| Thin-client context optimization | Slim `.cursorrules`/`AGENTS.md`; conditional reads; HANDOFF archive; `opencode.json` UI source — **2026-07-25** |
| Thin-client bootstrap | `.work/` + `.work.ui/` skeleton; `AGENT_OS_SOURCE` pointers; removed local `.ai.ui` — **2026-07-25** |
| Prod deploy prep (datawork.top) | Compose localhost binds; host nginx templates; `scripts/vps-deploy-datawork.sh`; `.env.prd.example` URLs — **2026-07-24** |
| Option 4 "Cleanup" upgraded | `bin/start.sh` — project-scoped prune (containers, images, networks, build cache) + interactive full cache prompt |
| Bug fixes (3) | Type fix `013` migration, user-status auth unblock, debug print cleanup |
| OAuth client_secret verification | `verify-client-credentials` endpoint + token endpoint integration |
| Admin session hardening (Priority 1A) | Signed Remix session storage; all admin routes migrated |
| Admin user-creation endpoint | `POST /admin/users` with email/password + OAuth support |
| Create User UI | Tailwind-styled form at `/admin/features/user-management/create` |
| Session expiry redirect | Admin root loader redirects expired sessions to sign-in |
| Test suite architecture | pytest per service + smoke tests + `bin/test.sh` + start.sh wiring |
| Agent OS bootstrap | `.work/` skeleton, `.cursorrules` from template |
| Credential hardening + env sync | Production-ready credentials in `.env`/`.env.prd`; start.sh shell cleanup; compose fixes for dev+prd; Redis AOF, nginx limits, migration ordering |
| SeaweedFS secrets removed from git | `s3-config.json`/`security.toml` → `.gitignore`; generated from `.env` by `scripts/init-seaweedfs-config.sh`; keys rotated |

---

## Blocked on owner

| # | Item | Notes |
|---|------|-------|
| 1 | Namecheap DNS + VPS go-live | A records for `tools`/`s3`/`www`; run `scripts/vps-deploy-datawork.sh` on VPS |
| 2 | Google OAuth redirect for tools.datawork.top | Update Google Cloud Console URI |
| 3 | tsconfig gate approval | Protected files: set `moduleResolution: "Bundler"` + add `@types/react*` (both frontends) — tsc currently unusable (~2393 pre-existing errors) |
| 4 | Google button label locale decision | Backend `buttonText` overrides translations; es pages show English label |

---

## Recommended next

| Priority | Item | Notes |
|----------|------|-------|
| **🔴 1** | **Finish VPS go-live (datawork.top)** | Deploy latest `main` (Access tab + role-500 fix + **client-app roles** + **JWKS route fix**) → DNS → sync `/opt/tools-dashboard` → `sudo bash scripts/vps-deploy-datawork.sh` → verify HTTPS/admin/WS/S3 + Access tab + app-roles cards + `/.well-known/jwks.json` |
| 2 | Client apps adopt `app_roles` | E-Cards/Rizervox integrate per `.work/docs/guides/client-app-roles/README.md` (claim fast path + validate-token authoritative) |
| 3 | Priority 1B & 1D | Public cookie audit + nginx API routing documentation table |
| 4 | Extend test suite | Add tests for remaining services (websockets, feature-registry), add frontend tests |


---

## Current iteration - AR: Client-app roles (appsuper/appglobal)

**Milestone ref:** AR · owner-directed Approved SPEC `.work/features/app-roles/20260811-SPEC.md` (no approved master plan — owner waiver via `@x-director` approval message 2026-08-11)
**Status:** complete
**Started:** 2026-08-11

### In scope
- Migration `014_app_user_roles.sql` (idempotent, runner-verified)
- back-api: `app_user_role_repository`, `APP_ROLES` registry + scope pairing, 6 platform-admin endpoints, audit events
- back-api tests per SPEC §11
- back-auth: `app_user_roles` metadata mirror, `app_roles` claim (issue/refresh), `validate-token` field, refresh placeholder fix
- back-auth token tests per SPEC §11
- front-admin: appsuper card (app detail), Client-app roles card (user detail), proxy routes, en/es locales

### Out of scope (explicit)
- Any privilege change for role holders (R7); existing endpoint guards untouched
- Bulk operations; additional roles beyond appsuper/appglobal
- Protected files (package.json, tsconfig, Dockerfiles, compose) — untouched

### Tasks
| ID | Description | Files | Status | Notes |
|----|-------------|-------|--------|-------|
| AR-T1 | Idempotent migration + runner verify | `back-postgres/schema/014_app_user_roles.sql` | done | Runner ×4 clean, re-runs no-op; `\d` matches SPEC §5; incl. catalog-guarded FK convergence block |
| AR-T2 | back-api grant APIs + domain + repository | `back-api/repositories/app_user_role_repository.py`, `back-api/features/app-library/{api.py,domain.py,models.py}` | done | 6 endpoints behind untouched `get_current_admin`; one shared write path (R14); audit on actual change only |
| AR-T3 | back-api tests (10 cases, SPEC §11) | `back-api/tests/test_app_user_roles.py`, `back-api/tests/conftest.py` | done | 19 passed (10 new + 9 pre-existing); conftest sys.path bootstrap (collection was broken) |
| AR-T4 | back-auth query channel (claim + validate-token + mirror + refresh fix) | `back-auth/core/database.py`, `back-auth/features/auto-auth/{api.py,domain.py}` | done | `app_roles` claim + response field; fail-closed R20 verified live; refresh placeholder user lookup fixed; `token_service.py` correctly untouched (admin-session JWT, not OAuth) |
| AR-T5 | back-auth token tests (4 cases, SPEC §11) | `back-auth/tests/` | done | 4 passed; pytest+pytest-asyncio installed in containers |
| AR-T6 | front-admin app-page appsuper card + proxies + locales | `front-admin/app/features/app-library/ui/AppRolesPanel.tsx`, `admin.api.app-library*`, page + locales | done | Effective holders incl. appglobal marked; debounced user picker reused; proxy forwards Bearer from `getAdminSession` (cookie-only would 401) |
| AR-T7 | front-admin user-page client-app roles card + proxies + locales | `front-admin/app/features/user-management/ui/UserAppRolesCard.tsx`, `admin.api.users.$userId.app-roles.tsx`, page + locales | done | appglobal grant isolated, confirm copy; per-row revoke; revalidate on success |
| AR-T8 | Full gates + MOD-01/MOD-06 registry + bookkeeping | `.work/` | done | Gates below; blast-radius high owner-approved via explicit full-implementation request |

### Acceptance criteria
- [x] All SPEC §11 test cases pass in containers (back-api 19/19, back-auth 4/4)
- [x] Migration runner twice → second run no-op (ran ×4, all clean; drop→self-heal verified live)
- [x] ruff: 0 **new** violations in touched files (per-file diff vs HEAD; large pre-existing baseline B008/EXE002/I001 unchanged); front-admin tsc 0 non-baseline errors in touched files
- [x] Smoke `bash bin/test.sh` 4/4
- [x] touch-scope pass; blast-radius high (5 areas, ~794 lines) — owner-approved

### Validation steps
- [x] Tests: back-api + back-auth pytest green (exit 0)
- [x] Lint: ruff per-file baseline diff — no new violations
- [x] Type: front-admin tsc — 0 non-baseline errors in touched files
- [x] Smoke: `bash bin/test.sh` → 4 passed
- [x] Live curl: grant appsuper+appglobal → `issue-tokens` claim + `validate-token` `app_roles:["appglobal","appsuper"]`; revoke → same token returns `[]` immediately; audit rows verified; duplicate grant produced no second row/event

### Owner blockers
- none

### Concept / NFR registry (this iteration)
| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-01 | yes | done | AI-assisted session — coupling audit below |
| MOD-06 | yes | done | AI-assisted session — risk summary below |

**MOD-01 coupling audit (2026-08-11, iteration AR):**
- Boundaries crossed: back-auth ↔ client-app (contract addition only: `app_roles` claim/field, additive, backward-compatible); front-admin ↔ back-api (6 new endpoints, existing guard reused); new repository module in back-api.
- New cross-boundary deps: none at the code level. Deliberate **data-level coupling**: back-auth reads `app_user_roles` from the shared Postgres (same pattern as its `users` ownership) — chosen explicitly (SPEC Q1) to avoid a synchronous back-auth→back-api hop on the token path. Mirror DDL drift risk mitigated by R19 byte-identical rule + live drop/self-heal test.
- Rollback isolation: each service reverts independently; table is inert if unused.

**AI change risk summary (MOD-06 — 2026-08-11, iteration AR):**
- AI-assisted: yes (two coder subagents, orchestrated; gates re-run first-hand by orchestrator)
- Boundaries crossed: see MOD-01 above; no new imports/RPC/shared models beyond the contract addition
- Test isolation: ok — 14 new tests (10 back-api HTTP-level with in-memory fakes, 4 back-auth) cover grant/revoke/idempotency/scope-pairing/cross-app-leak/fail-closed; live curl end-to-end evidence incl. immediate revocation on same token
- Human architectural review: recommended for the back-auth metadata mirror + FK convergence guard (deviation 1, SPEC §5 channel split) — the one place design judgment exceeded the verbatim SPEC
- Blast radius: if wrong, `app_roles` claim/field misreports (clients see `[]` fail-closed) or grant 4xxs; existing auth/admin paths provably untouched (regression tests + untouched guards); recovery = revert; table is inert
- Recommendation: merge_ok. Residuals: no UI unit tests (not configured); authenticated browser click-through not performed (no headless browser); ruff/tsc baselines remain pre-existing owner blockers.
- Blast-radius gate: risk high (5 areas, ~794 lines) — owner-approved via explicit "full implementation" request (2026-08-11)

### Cross-LLM verification
- Triggered: no

### Done this iteration
| Task | Completed | Notes |
|------|-----------|-------|
| AR-T1 | 2026-08-11 | Migration 014; runner ×4 clean; drop→self-heal verified |
| AR-T2 | 2026-08-11 | 6 endpoints + registry + repository + audit |
| AR-T3 | 2026-08-11 | back-api 19 passed |
| AR-T4 | 2026-08-11 | claim + validate-token + mirror + refresh fix |
| AR-T5 | 2026-08-11 | back-auth 4 passed |
| AR-T6 | 2026-08-11 | appsuper card + proxies + locales |
| AR-T7 | 2026-08-11 | Client-app roles card + appglobal control |
| AR-T8 | 2026-08-11 | Gates green; registry filled |
| AR-fix | 2026-08-12 | Post-release UI bug: both page loaders expected a bare array but back-api returns envelopes (`{assignments,…}` / `{holders,…}`) → cards rendered empty despite successful grants; fixed envelope parsing + `app_client_id` field name; tsc 0 new errors, smoke 4/4, live backend envelope verified |
| AR-fix2 | 2026-08-12 | Guide verification surfaced: JWKS public route was 404 since inception — dotfile route name ignored by Remix flat routes; renamed to `[.well-known].jwks[.json].tsx` + fixed env fallback (`BACK_AUTH_URL` unset in container → `AUTH_API_URL` chain, `http://back-auth:8001` default). Live: `/.well-known/jwks.json` returns RS256 key. Integration guide written: `.work/docs/guides/client-app-roles/README.md` |

*(Template for future iterations preserved below under concept registry history.)*

### Concept / NFR registry (2026-07-28 — user-role runtime 500 repair, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session (runtime repair) — risk summary below |

**AI change risk summary (MOD-06 — 2026-07-28 user-role 500 repair):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — single feature (user-management role) backend; repository `json.dumps` serialization + domain try/except wrappers; no new imports/RPC/shared models, no frontend changes
- New cross-boundary deps: none (`json` is stdlib; try/except is language-level)
- Test isolation: ok — `pytest tests/test_user_management_role.py` 3/3 pass (VALID_USER_ROLES / default permissions / cannot change own role); runtime: live `curl PATCH` → HTTP 200 (both empty `[]` and non-empty `["*"]` permissions), role persists in PostgreSQL
- Human architectural review: optional — 2 backend files, ~12 lines (repository serialization + 2 defensive try/except wrappers); surgical hotfix
- Blast radius: if wrong, role-change breaks again (caught immediately by live curl + backend tests); no data loss possible — PostgreSQL UPDATE runs first, only best-effort Cassandra/audit/session steps are wrapped. Recovery = revert single-area diff
- Recommendation: merge_ok. Residual: Cassandra canonical profile for integer-ID users NOT updated on role change (UUID/integer contract mismatch — tracked in HANDOFF); session invalidation stubbed (JWT TTL fallback).
- Blast-radius gate: risk medium (2 areas: back-api + .work, 57 lines) — within default approve threshold

### Concept / NFR registry (2026-07-28 — user-role verify+repair, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session (verify+repair) — risk summary below |

**AI change risk summary (MOD-06 — 2026-07-28 user-role repair):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — single feature (user-management role); backend `domain.py` validators tightened, route mount path unchanged; frontend route adds `useRevalidator` hook (`@remix-run/react` already a dep); no new cross-module imports
- New cross-boundary deps: none — `useRevalidator` already exported by existing dep
- Test isolation: ok — `pytest tests/test_user_management_role.py` 3/3 pass (VALID_USER_ROLES validation, role default permissions, "cannot change own role"); UI tests not configured (residual)
- Human architectural review: optional — 3 files edited, ~6 lines net; surgical repair (loader refresh + dead locale keys removed)
- Blast radius: if wrong, role-save button fails to refresh loader data (UI still shows new role via local `currentRole`) OR revalidator typo crashes route on render (caught by tsc + smoke). Recovery = revert single-area diff
- Recommendation: merge_ok
- Blast-radius gate: risk high (3 areas: back-api + front-admin + .work, 219 lines) — owner-approved via explicit verify+repair request (2026-07-28)

### Concept / NFR registry (2026-07-28 — Access-tab deployment-prep fix, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session (second-pass) — risk summary below |

**AI change risk summary (MOD-06 — 2026-07-28 deployment-prep):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — UI warning only (`AccessControlPanel.tsx` + en/es locale keys); backend untouched this turn
- New cross-boundary deps: none
- Test isolation: weak — UI unit tests not configured; gates: tsc 0 non-baseline errors in touched files, smoke 4/4, backend tests 4/4 (from prior session)
- Human architectural review: optional — single area (front-admin), 3 lines UI + 2 locale keys
- Blast radius: if wrong, the amber warning shows the wrong copy on admin Access tab under `subscription_based`; no behavioral impact on actual access checks (backend logic unchanged)
- Recommendation: merge_ok. Pairs with prior session's backend subscription lookup record above

### Concept / NFR registry (2026-07-28 — Access-tab reliability fixes, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session — risk summary below |

**AI change risk summary (MOD-06):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — `front-admin` app-library feature only; backend untouched, no new RPC/endpoints/shared models
- New cross-boundary deps: none (`useNavigation` already used in app; `Promise.allSettled` is platform)
- Test isolation: weak — `bash bin/test.sh` smoke 4/4 (does not isolate Access tab UI; UI unit tests not configured); fallback: static contract check vs `back-api` app-library `api.py:733` + `AccessRuleCreate` `models.py:211`; `tsc` 0 non-baseline errors in touched files; en/es locale parity
- Human architectural review: optional — 3 code files, ~370 lines, single feature area
- Blast radius: if wrong, admin Access tab degrades (save failures, error banners, loader errors on per-user fetch — now hardened via allSettled); no backend/data/public impact; admins only; recovery = revert single-area diff
- Recommendation: merge_ok. Residual: real-browser submit/hydration unverified (no headless browser); `page_size` capped at 100 in backend so users beyond first page reachable only via manual IDs (by design, surfaced via hint)
- Blast-radius gate: risk medium (2 areas: front-admin + .work bookkeeping) — owner-approved via explicit "fix any issues… ready for production" request (2026-07-28)

### Concept / NFR registry (2026-07-25 — i18n verification + fixes, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session — risk summary below |

**AI change risk summary (MOD-06):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — independent per-area fixes (front-admin, front-public, infra/nginx), no new inter-module imports/RPC
- New cross-boundary deps: none (`X-Forwarded-Proto` header convention only)
- Test isolation: weak — `bash bin/test.sh` smoke green (4/4) but does not isolate i18n; verification via live curl probes (signin CSRF error en/es, oauth-error page en/es, change-language redirects same-origin/TLS/cross-origin, nginx /health)
- Human architectural review: optional — small diff (10 files, ~73 lines), no boundary crossings
- Blast radius: if wrong, language switching/server-side translations on admin+public apps degrade and landing switcher may fail — user-facing only; no data, jobs, or backend state affected
- Recommendation: merge_ok. Residual: real-browser hydration unverified; baseline `tsc` broken pre-existing (missing `@types/react`, TS2307 remix-i18next subpaths — tsconfig protected)
- Blast-radius gate: risk high (4 areas) — owner-approved via explicit cross-area request "verify all changes… implement any fixes" (2026-07-25)
- Follow-up (same day): plain-value `i18nCookie` in both apps fixes landing→portal language persistence (Remix base64 cookie encoding was ignoring the landing's plain cookie); live-verified, smoke 4/4

### Concept / NFR registry (2026-08-14 — app-library reachability fix, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session (small UI fix) — risk summary below |

**AI change risk summary (MOD-06 — 2026-08-14 reachability fix):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — single feature area (`front-public` app-library UI): hook + badge + locales only; no backend, no shared models, no RPC
- New cross-boundary deps: none (React hooks/`fetch` already in use; `AbortController` is platform)
- Test isolation: weak — UI unit tests not configured (documented repo gap); verification: tsc 0 non-baseline errors in touched files (baseline 959 = missing `@types/react`, owner blocker #3), en/es JSON valid, smoke 4/4, touch-scope pass
- Human architectural review: optional — 3 front-public files; client-side display-only badge
- Blast radius: if wrong, the reachability chip on the public app-library page mislabels app status (loopback targets on remote pages show neutral "Unchecked"; remote targets get 3 retries before Offline). No data, no backend, no launch-path impact (badge is display-only; Launch button unchanged). Recovery = revert single-area diff
- Recommendation: merge_ok. Residual: real-browser badge behavior unverified (no headless browser); baseline tsc remains broken pre-existing
- Blast-radius gate: measured high (5 areas incl. session bookends `.work`/`.work.ui` + pre-existing untracked `reasonix.toml`) — fix footprint is 1 area (front-public, 4 files); owner-approved via explicit "apply your recommended fix" request (2026-08-14)

### Concept / NFR registry (2026-08-14 — email removal + user-subscription placeholder hide, no formal iteration)

| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | done | AI-assisted session (small UI cleanup) — risk summary below |

**AI change risk summary (MOD-06 — 2026-08-14 email/placeholder cleanup):**
- AI-assisted: yes
- Boundaries crossed: 0 hard module boundaries — single area (`front-public`): auth aside, verify banner/route, app-library error + oauth-error states, PublicLayout nav, user-subscription route wrappers, en/es locales
- New cross-boundary deps: none
- Test isolation: weak — UI unit tests not configured; verification: tsc 0 non-baseline errors in touched files (baseline 932 = missing `@types/react`, owner blocker #3), en/es JSON valid, smoke 4/4, live curl: both `/app/features/user-subscription*` → 302 `/app/`; `support@tools-dashboard.io` count 0 on auth + home HTML
- Human architectural review: optional — display-only removals + route redirects; feature code preserved intact under `features/user-subscription/`
- Blast radius: if wrong, users lose a `mailto:` support shortcut on 4 screens (no functional loss) and the placeholder subscription pages 302 to `/app/` instead of rendering (they were hardcoded mock data; checkout POST was a stub). No data, no backend, no auth impact. Recovery = revert single-area diff
- Recommendation: merge_ok. Residual: `feature.yaml:196 contact: support@tools-dashboard.io` remains (spec metadata, not user-visible); unused locale keys `common.contactSupport`/`oauthError.contactSupport`/`header.nav.pricing` left in place

**Follow-up (same day, owner feedback):** (1) Reachability now probes **every target with 3 retries, plus a server-side fallback** — new same-origin endpoint `/app/api/reachability?url=` (`app.api.reachability.tsx`) whose loader probes the target from the server's network, rewriting loopback hostnames to the Docker-host gateway (`172.17.0.1`, env `REACHABILITY_HOST_IP`) since dev apps (E-Card `localhost:7300`) run on the host, not in the container. The browser tries the direct probe first; if blocked (Chrome Private Network Access / mixed content) or the target is down, the server verdict decides. The badge **re-checks every 15s** so status stays live without reloading. Live-verified through nginx: `localhost:7300` → `{"ok":true}` (E-Card Available), `localhost:17513` → `{"ok":false}` (Rizervox Offline), `file://` → 400. (2) All non-existent `/app/*` URLs (new `app.$.tsx` splat) and the hidden `user-subscription` routes redirect to `/app/features/app-library` (was `/app`). tsc non-baseline clean; smoke 4/4; touch-scope pass.

```markdown
## Current iteration - M{N}: <milestone name>

**Milestone ref:** M{N} · `{MASTER_PLAN}` §<task section>
**Status:** planning | in-progress | complete
**Started:** YYYY-MM-DD

### In scope
- …

### Out of scope (explicit)
- …

### Tasks
| ID | Description | Files | Status | Notes |
|----|-------------|-------|--------|-------|
| M{N}-T1 | … | … | pending | |

### Acceptance criteria
- [ ] …

### Validation steps
- [ ] Tests: `bash bin/test.sh`
- [ ] Lint: `docker compose exec back-api bash -c "cd /app && ruff check ."`
- [ ] Type: `docker compose exec back-api bash -c "cd /app && pyright ."`

### Owner blockers
- none

### Concept / NFR registry (this iteration)
| Concept id | Applies | Status | Evidence / trigger |
|------------|---------|--------|-------------------|
| MOD-06 | yes | pending | AI-assisted session |

### Cross-LLM verification
- Triggered: no

### Done this iteration
| Task | Completed | Notes |
|------|-----------|-------|
```
