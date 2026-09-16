# NEXT — concept / NFR registry history

Completion records moved out of `.work/plans/NEXT.md` (2026-09-15) so the live backlog carries only
open work plus the current iteration. Content below is **verbatim** from `NEXT.md` at archive time:
one `MOD-06` / `MOD-01` AI-change-risk record per session that ran without a formal iteration
(2026-07-25, 2026-07-28 ×4, 2026-08-14 ×2).

Live backlog: `.work/plans/NEXT.md` · Iteration task tables: `NEXT.md` § Current iteration.

---

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
