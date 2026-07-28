# NEXT - planning backlog

**Updated:** 2026-07-28

---

## Done

| Item | Artifact |
|------|----------|
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
| **🔴 1** | **Finish VPS go-live (datawork.top)** | Deploy latest `main` (includes Access tab) → DNS → sync `/opt/tools-dashboard` → `sudo bash scripts/vps-deploy-datawork.sh` → verify HTTPS/admin/WS/S3 + Access tab |
| 2 | Priority 1B & 1D | Public cookie audit + nginx API routing documentation table |
| 3 | Extend test suite | Add tests for remaining services (websockets, feature-registry), add frontend tests |


---

## Current iteration

*(No active iteration - run `@code-implementation plan - M1` after master plan is **Approved** and `implementation-ready: yes`.)*

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
