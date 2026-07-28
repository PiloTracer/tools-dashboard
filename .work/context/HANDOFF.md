# Tools Dashboard — session handoff

**Purpose:** Fast resume for the next chat or engineer.

**Updated:** 2026-07-25 · **Mode:** thin-client

## Cross-framework action (@x-director)

**Date:** 2026-07-28 (user-role runtime 500 repair)
**Request:** "When I attempt to change the role of a user, I get 'Server Error', the functionality is failing."
**Frameworks involved:** .ai (engineering)
**Classified framework bucket(s):** engineering (backend)
**Routing confidence:** high
**Preflight (frameworks installed):** .ai yes | .ai.ui yes (n/a) | .ai.biz yes (n/a) | .ai.soc yes (n/a)
**Executed:**
1. Reproduced the failure with live curl: `PATCH /admin/users/2/role` → HTTP 500 `Internal Server Error`. Captured the backend traceback → root-caused via runtime evidence (not memory).
2. **Bug A (the actual 500 the user saw)**: `back-api/repositories/user_repository.py` bound Python `list` directly to `$2::jsonb` at 4 sites (create_user, update_role, update_user_role line 411, bulk_update_role line 472). asyncpg requires a JSON **string** for jsonb (no codec registered); both `[]` (empty) and `["*"]` (non-empty) rejected with `DataError: invalid input for query argument $2: [] (expected str, got list)`. Fixed: `json.dumps(permissions)` at all 4 bind sites + `import json`. (`create_user` was latently broken too — same fix covers it.)
3. **Bug B (the 400 surfaced after Bug A)**: `domain.py update_user_role` called `sync_canonical_data(user_id=str(user_id))` which reaches `uuid.UUID(user_id)` in `user_ext_repository.py:210` — `uuid.UUID("2")` raises `ValueError("badly formed hexadecimal UUID string")` because integer-string IDs are not UUIDs. This call was unwrapped, so the ValueError propagated → endpoint returned HTTP 400. `update_user_status` doesn't have this problem (it never calls sync_canonical_data). Fixed: wrapped the `sync_canonical_data` call in try/except (best-effort), matching the established defensive pattern already used for session-invalidation and audit-log in the same method. PostgreSQL is the source of truth for auth/role; Cassandra canonical sync is secondary.
4. **Bug C (defensive hardening, same turn)**: `domain.py update_user_role` audit-log call (`create_audit_log`) was also unwrapped — same latent ValueError from `uuid.UUID("2")` in the audit repo. Wrapped in try/except, symmetric with `update_user_status`'s `log_audit_event` wrapper. Audit logging is best-effort and must not break a user-facing role change.
5. Runtime verification (live curl, not just gates): backend direct PATCH → HTTP 200 with full `UserDetailResponse` body; role persists in DB (`admin | ["*"]`, `moderator | []`); frontend proxy (`/admin/api/users/2/role` via nginx :8082) → HTTP 200; DB confirms `moderator`. The user-facing "Server Error" is resolved.
6. Gates: touch-scope pass (scope expanded to include `back-api/repositories/user_repository.py`); blast-radius medium (2 areas: back-api + .work, 57 lines); backend pytest 7 passed (3 role + 4 access — pre-existing Pydantic V1 deprecation warnings unrelated); smoke 4/4; front-admin tsc 0 non-baseline errors in touched files (2508 total = documented baseline from missing @types/react).
7. MOD-06 run (AI-assisted, not human-only) → merge_ok; recorded in NEXT.md concept registry.
**User correction:** none
**Coordination notes:** single-framework (engineering); no UI work this turn — "Server Error" was a backend data-serialization fault, not a UI defect
**Blockers:** none for code. **Deployment requires owner to** `git add` the untracked paths (`admin.api.users.$userId.role.tsx`, `back-api/tests/test_user_management_role.py`) plus the tracked-modified `back-api/repositories/user_repository.py` and `back-api/features/user-management/domain.py` before committing — `git add -u` alone would miss the two untracked files.
**Next recommended:** Owner commits (with untracked files) + deploys back-api (and front-admin for the role-card UI) to VPS; manual browser verify: admin → User management → open non-self user → Role card → change role → Save → 200 + loader refresh + profile shows new role → re-open user (role persisted).
**Residual (honest, not repaired by design):**
- `sync_canonical_data` for user-management still has a UUID-vs-integer-ID contract mismatch (Cassandra extended-profile keys expect UUID; PostgreSQL user IDs are integers). My try/except makes role-change resilient to this, but the Cassandra canonical profile for integer-ID users is NOT updated on role change. A proper fix would derive a deterministic `uuid.uuid5(NAMESPACE, str(user_id))` (the pattern `get_user_detail` already uses) and pass that — but that needs verifying the Cassandra table's existing key scheme to avoid writing orphan rows. Out of scope for this hotfix; tracked here.
- `auth_service.invalidate_user_sessions` is also stubbed/miswired (`'InfrastructureRegistry' object has no attribute 'invalidate_user_sessions'` — visible in logs, swallowed by try/except). Sessions will eventually expire via JWT TTL instead. Pre-existing; not introduced here.

---

## Cross-framework action (@x-director)

**Date:** 2026-07-28 (user-role verify+repair)
**Request:** "verify and repair the currently uncomitted code."
**Frameworks involved:** .ai (engineering), .ai.ui (degraded — native Tailwind role-card on existing admin screen)
**Classified framework bucket(s):** cross-framework (engineering + ui)
**Routing confidence:** high
**Preflight (frameworks installed):** .ai yes | .ai.ui yes (degraded for this scope) | .ai.biz yes (n/a) | .ai.soc yes (n/a)
**Executed:**
1. Verified uncommitted admin user-role-assignment feature (prior session had implemented: `back-api/features/user-management/domain.py` role validation + `DEFAULT_ROLE_PERMISSIONS` + `resolve_role_permissions`; `front-admin/app/routes/admin.features.user-management.$userId.tsx` role card UI; `front-admin/app/routes/admin.api.users.$userId.role.tsx` PATCH proxy; `back-api/tests/test_user_management_role.py` 3 tests; en/es locales). Backend contract confirmed: `@router.patch("/{user_id}/role")` with `Depends(get_current_admin)` → admin enforced at backend; proxy path forwards cookie correctly.
2. Defects found and repaired this turn:
   - **HIGH reliability**: role-save used raw `fetch()` with no `useRevalidator()` on the route → loader `user.role` stayed stale after a successful PATCH (UI masked it via local `currentRole` but loader-data drift is a Remix anti-pattern). Added `useRevalidator` import + `revalidator.revalidate()` call on success.
   - **LOW dead code**: removed unused `roleCardNote` locale keys from en/es (the card hides entirely via `!isEditingOwnAccount`, so the "you cannot change your own role" note was never rendered).
3. Residual (not repaired, by design): hardcoded English audit-reason string `"Role changed to ${selectedRole} by administrator"` sent to backend regardless of UI locale — audit logs are conventionally English-only; user never sees this string on the page.
4. Gates re-run on post-repair state: touch-scope pass; blast-radius high (3 areas: back-api + front-admin + .work, 219 lines) — owner-approved via explicit verify+repair request; front-admin tsc 0 non-baseline errors in touched files (2508 total = documented baseline from missing `@types/react`, owner blocker #3); smoke 4/4; backend pytest 7 passed (3 role + 4 app-library access; pytest+pytest-asyncio now installed in back-api container); en/es locale JSON valid.
5. MOD-06 run (AI-assisted, not `human-only`) → `merge_ok`; recorded in `NEXT.md` concept registry.
**User correction:** none
**Coordination notes:** .ai.ui portion handled natively (Tailwind role-card in existing admin screen) — no `ui-*` skill chain needed; MOD-06 output recorded in `NEXT.md`
**Blockers:** none for code. **Deployment requires owner to** `git add` the two untracked paths (`admin.api.users.$userId.role.tsx`, `back-api/tests/test_user_management_role.py`) before committing — `git add -u` alone would deploy a broken admin role-card.
**Next recommended:** Owner commits (with untracked files) + deploys front-admin + back-api to VPS; manual browser verify: admin sign-in → User management → open a non-self user → Role card → change role → Save (loader refreshes, profile dd shows new role) → re-open the user (role persisted) → try to change own role (card hidden).

---

## Cross-framework action (@x-director)
**Date:** 2026-07-25
**Request:** "Add bilingual informational mini-website at https://tools.datawork.top/ root; keep public/admin entry cards always visible; EN/ES like current i18n."
**Frameworks involved:** .ai (engineering), .ai.ui (degraded — design applied natively)
**Classified bucket(s):** cross-framework (ui + engineering)
**Routing confidence:** high
**Preflight:** .ai yes · .ai.ui yes · .ai.biz no · .ai.soc no
**Executed:**
1. Expanded `infra/nginx/landing/index.html` — informational sections + sticky entry rail (desktop) + fixed dock (mobile); inline EN/ES via `i18next` cookie alignment.
2. Updated `infra/nginx/host-setup/05-install-prd-datawork-host-nginx.sh` to copy optional landing assets.
**Blockers:** none — redeploy landing to VPS required.
**Next recommended:** On VPS: `sudo cp` landing or re-run host nginx install script after `git pull`.

---

## Session status

**Closed:** 2026-07-28 — admin app-library Access tab UI + subscription tier lookup; verification fixes; smoke 4/4

**Updated:** 2026-07-28

Treat the next chat as a **new session**: do not assume unwritten goals from prior threads unless they appear in this file or linked artifacts.

---

## What this cycle produced (2026-07-28)

| Area | Artifact |
|------|----------|
| Admin Access tab UI | `AccessControlPanel.tsx` + `admin.features.app-library.$appId.tsx` — modes, user picker, server search, tab URL persistence |
| User search API route | `admin.api.users.search.tsx` — debounced admin user lookup |
| Backend subscription access | `fetch_user_subscription_for_access()` in `domain.py`; wired in `api.py` (replaces hardcoded `pro`) |
| Backend tests | `back-api/tests/test_app_library_access.py` — tier mapping unit tests |
| i18n | `appLibrary.access.*` en/es including validation error keys |
| Gates | touch-scope pass; blast-radius high (3 areas, in scope); smoke 4/4 |

**Deploy:** sync `front-admin` + `back-api` to VPS (owner action #2); browser-verify Access tab save + public library filtering.

---

## Cross-framework action (@x-director)

**Date:** 2026-07-28 (third action)
**Request:** "implement all remaining fixes... verify the application is reliable. and get ready for deployment!"
**Frameworks involved:** .ai (engineering), .ai.ui (degraded — native Tailwind warning in existing admin screen)
**Classified framework bucket(s):** cross-framework (engineering + ui)
**Routing confidence:** high
**Preflight (frameworks installed):** .ai yes | .ai.ui yes (degraded for this scope) | .ai.biz yes (n/a) | .ai.soc yes (n/a)
**Executed:**
1. Re-verified all 10 issues from `tmp/feedback.md` against the on-disk code (a prior session between turns had implemented the backend subscription lookup #2, `admin.api.users.search.tsx` #5, and `back-api/tests/test_app_library_access.py` #9 — confirmed via direct file evidence). Issues fixed by prior session: #1 (formAction `?tab=access`), #2 (`fetch_user_subscription_for_access` real `user_subscriptions` query, `domain.py:111`), #4 (usersLoadError), #5 (server-side debounced search), #6 (selectedCount with manual IDs), #7 (i18n `appLibrary.access.errors.*`), #8 (`accessRuleSyncKey` stable string).
2. Remaining production-readiness fixes implemented this turn:
   - **Reliability/safety**: added a `tiersWarning` amber alert to the `subscription_based` UI section so admins do not silently deny every user when the subscription pipeline isn't populating `user_subscriptions` in production (residual risk #5 from prior assessment). en/es locale parity.
   - **Bookkeeping accuracy**: corrected the stale blast-radius note (prior HANDOFF entry said "medium (2 areas)" but scope is now 3 areas — back-api added by prior session).
3. Deployment readiness: `./bin/start.sh prd preflight` → OK (compose config valid; deploy secrets POSTGRES_PASSWORD/JWT/DEFAULT_ADMIN_PASSWORD present); `.env.prd.example` covers AUTH_SERVICE_URL, TD_PUBLIC_BASE_URL, JWT_SECRET_KEY. Confirmed `API_URL` fallback chain works in prd (route uses `process.env.API_URL || "http://back-api:8000"`; prd compose sets `BACKEND_API_URL` which routes don't read — pre-existing project-wide redundancy, not a blocker).
4. Gates re-run on current disk state: touch-scope pass (scope expanded by prior session to include `back-api/features/app-library/**`, `back-api/tests/**`); blast-radius high (3 areas: back-api + front-admin + .work, 591 lines) — owner-approved via explicit deploy-ready request; fronts tsc 0 non-baseline errors in touched files (2464 total = documented baseline from missing `@types/react`, owner blocker #3); smoke 4/4; backend tests 4/4 (`tests/test_app_library_access.py`, run directly since pytest not installed in container).
5. MOD-06 re-run (AI-assisted, not `human-only`) → `merge_ok`; see `NEXT.md` concept registry.
**User correction:** none
**Coordination notes:** .ai.ui portion handled natively (amber Tailwind alert in existing admin screen); MOD-06 output recorded in `NEXT.md`
**Blockers:** none for code. **Deployment requires owner to** `git add` the three untracked paths (`AccessControlPanel.tsx`, `admin.api.users.search.tsx`, `back-api/tests/`) before committing — `git add -u` alone would deploy a broken admin app.
**Next recommended:** Owner commits (with untracked files), deploys front-admin + back-api to VPS (owner action #2), then manual browser verify: admin sign-in → Access tab → `only_specified` → pick 2 users → Save (stay on Access tab w/ success banner) → sign in as listed user (app visible) + unlisted user (app hidden).

---

## Cross-framework action (@x-director)

**Date:** 2026-07-28 (second action)
**Request:** "fix any issues - make sure code is reliable, professional and ready for production."
**Frameworks involved:** .ai (engineering), .ai.ui (degraded — native Tailwind form in existing admin screen, no design-system/tokens/screen-spec work)
**Classified framework bucket(s):** cross-framework (engineering + ui)
**Routing confidence:** high
**Preflight (frameworks installed):** .ai yes | .ai.ui yes (degraded for this scope) | .ai.biz yes (n/a) | .ai.soc yes (n/a)
**Executed:**
1. Verified uncommitted Access-tab code (4 gates: touch-scope pass, blast-radius medium/in-scope, tsc 0 non-baseline errors in touched files, smoke 4/4); confirmed backend contract (`api.py:733` + `AccessRuleCreate` `models.py:211` + `page_size` capped at 100 in `user-management/api.py:35`)
2. Fixed 5 production-readiness issues in `AccessControlPanel.tsx` + `admin.features.app-library.$appId.tsx` + en/es locales:
   - Reliability: `Promise.all` → `Promise.allSettled` + try/catch in `loadAccessUsers` (one bad user-ID no longer rejects whole loader)
   - Clean stored data: action prunes `user_ids`/`subscription_tiers` by mode so `all_users` doesn't persist stale selections (matches backend `AccessRuleCreate` validators)
   - React-idiomatic form: replaced fragile `onSubmit` DOM-mutation of hidden inputs with `useMemo`-derived controlled values
   - Double-submit lock: `useNavigation` + `<fieldset disabled>` + `aria-busy` + "Saving…" label (en/es `access.saving` key)
   - Professional UX: `isDirty` flag hides stale "saved" banner on first edit
3. MOD-06 run (AI-assisted, not `human-only`) → `merge_ok`; blast-radius medium (2 areas: front-admin + .work bookkeeping) — owner-approved via explicit production-ready request
**User correction:** none
**Coordination notes:** .ai.ui portion handled natively (Tailwind form in existing admin screen) — no `ui-*` skill chain needed; MOD-06 output recorded in `NEXT.md` concept registry
**Blockers:** none — deploy front-admin to production to use on tools.datawork.top
**Next recommended:** Deploy to VPS (owner action #2); real-browser submit/hydration verification (no headless browser available); backend `page_size` cap means users beyond first page reachable only via manual IDs (accepted, surfaced via UI hint)

---

## Cross-framework action (@x-director)

**Date:** 2026-07-28
**Request:** "Option A is the closest, but I need full control through the access tab UI: 1) plan the feature, 2) implement the feature"
**Frameworks involved:** .ai (engineering), .ai.ui (degraded — native Tailwind form in existing admin screen)
**Classified bucket(s):** cross-framework (engineering + ui)
**Routing confidence:** high
**Preflight:** .ai yes · .ai.ui yes · .ai.biz no · .ai.soc no
**Executed:**
1. Planned Access tab scope: wire existing `POST /api/admin/app-library/{id}/access` to admin UI; modes `all_users`, `all_except`, `only_specified`, `subscription_based`; user search + checkbox picker + manual ID fallback.
2. Implemented `AccessControlPanel` + loader/action in `admin.features.app-library.$appId.tsx`; en/es locale strings under `appLibrary.access`.
**Blockers:** none — deploy front-admin to production to use on tools.datawork.top
**Next recommended:** Deploy to VPS; verify Access tab on a live app with `only_specified` users

---

## What this cycle produced (2026-07-25)

| Area | Artifact |
|------|----------|
| Thin-client bootstrap | `.cursorrules` + `.work/` + `.work.ui/` + `opencode.json`; no local `.ai/` or `.ai.ui/` |
| Context slimming | HANDOFF 123 lines; `AGENTS.md` 38-line index; archive at `.work/context/archives/` |
| Rule fixes | Host smoke test exception; UI typecheck gate; conditional read routing; MCP disabled |
| i18n verification + fixes | `a5b8332` — server `getFixedT` raw-key bug (both apps), 0-based Trans tags, X-Forwarded-Proto redirects, landing switcher guard, plain `i18next` cookie contract (landing↔apps persistence), dev nginx `/health` |
| Portal home copy | Template marketing copy replaced with product-accurate text (en/es); third feature tile repointed to app library |
| Commits | `6e26a63` (bootstrap), `616c2f0` (context optimization) — both on `main` |

**Local cleanup (optional):** delete `.ai.back/` and `.ai.ui.back/` (~86 MB) when ready.

---

| Area | State |
|------|-------|
| Agent OS | Thin-client — skills/standards resolve from `$AGENT_OS_SOURCE` (no local `.ai/`) |
| UI Design OS | Thin-client — skills resolve from `$AI_UI_SOURCE` (no local `.ai.ui/`) |
| Project memory | `.work/` (backend/product) · `.work.ui/` (UI) |
| Planning | No approved master plan; tactical backlog in `NEXT.md` |
| Tests | Host smoke: `bash bin/test.sh` (stack must be up) |

---

## Open owner actions

| # | Action |
|---|--------|
| 1 | Namecheap A records: `tools` / `s3` / `www` → VPS public IPv4 |
| 2 | Sync repo to `/opt/tools-dashboard`; run `sudo bash scripts/vps-deploy-datawork.sh` |
| 3 | Google OAuth redirect URI + production SMTP for `tools.datawork.top` |
| 4 | Approve tsconfig fix: `moduleResolution: "Bundler"` + `@types/react*` devDeps (both frontends) so `tsc` works as a gate |
| 5 | Decide Google sign-in button label: backend-configured `buttonText` (always English) vs translated `t()` on es pages |

---

## Production target

| Item | Value |
|------|--------|
| Public app | `https://tools.datawork.top` |
| Public S3 | `https://s3.datawork.top` |
| Compose | `docker-compose.prd.yml` (nginx `127.0.0.1:8082`, Seaweed S3 `127.0.0.1:8333`) |
| Env template | `.env.prd.example` (secrets in gitignored `.env.prd`) |
| Host nginx | `infra/nginx/host-setup/prd/` |
| VPS script | `scripts/vps-deploy-datawork.sh` |
| DNS checklist | `infra/nginx/host-setup/prd/NAMECHEAP_DNS.md` |

WebSockets: `wss://tools.datawork.top/ws/` when site is HTTPS.

---

## How to run (dev)

```bash
./bin/start.sh dev up-build    # start stack
./bin/start.sh dev             # interactive menu
bash bin/test.sh               # smoke tests (host; stack running)
./bin/start.sh dev preflight   # compose + env checks
```

Production validate: `./bin/start.sh prd preflight` then `prd up-build`.

**Naming:** production file suffix is `prd` (not `prod`). `bin/start.sh` accepts `prod` as a CLI alias only.

---

## Active improvement track

| Item | Location |
|------|----------|
| Three-priority roadmap (P1–P3) | `.work/plans/20260422_PLAN_application-improvement-priorities.md` |
| Feature SPECs | `.work/features/<slug>/` |
| Production deploy proposal | `.work/plans/proposals/20250714-production-backup-restore-readiness.md` |

**Priority 1 remaining (summary):** 1B public session cookie audit; 1D nginx API routing documentation table. Admin session hardening (1A), OAuth `client_secret` verification, and test suite architecture are landed — see archive for detail.

---

## UI layer

| Item | Location |
|------|----------|
| UI handoff | `.work.ui/context/HANDOFF_UI.md` |
| UI backlog | `.work.ui/plans/NEXT_UI.md` |
| Next step | `@ui-design-foundation greenfield` (foundation 01–04 not yet authored for this product) |

---

## Where to look next

| Task | Start here |
|------|------------|
| Stack / ports / architecture | `DOCS_TECH_STACK.md` |
| UI stack / commands | `DOCS_UI_STACK.md` |
| Feature work | `.work/features/<slug>/feature.yaml` + README |
| Session / iteration process | `$AGENT_OS_SOURCE/START_HERE.md` |
| Nginx / TLS | `infra/nginx/README.prd.md`, `infra/nginx/default.prd.conf` |
| Start script | `bin/start.sh` |
| App library OAuth bootstrap | `back-postgres/schema/008_*.sql`, `009_*.sql`, `011_*.sql` |
| Public OAuth redirect selection | `front-public/app/features/app-library/utils/oauth.ts` |

---

## Postgres migrations (read before editing seeded clients)

- `back-postgres/main.py` runs all `back-postgres/schema/*.sql` in sorted order on **every** service start.
- E‑Cards / Rizervox bootstrap rows (`008`, `009`) use `ON CONFLICT DO NOTHING` — restarts do not overwrite admin edits.
- `011_oauth_redirect_strip_bad_hosts.sql` repairs bad callback hosts when a good URI remains.

---

## History

Detailed landed-work tables, deployment checklists, and Priority 1 step lists from earlier sessions: `.work/context/archives/HANDOFF-history-pre-thin-client.md` (secrets redacted).

---

## Cross-framework action (@x-director)

**Date:** 2026-07-25
**Request:** "verify all changes in the last 12 hours. Make sure the system is reliable, languages are properly handled. Implement any fixes that you deem necessary"
**Frameworks involved:** .ai, .ai.ui
**Classified framework bucket(s):** cross-framework (engineering + ui)
**Routing confidence:** high
**Preflight (frameworks installed):** .ai yes | .ai.ui yes | .ai.biz yes | .ai.soc yes
**Executed:**
1. Verified commits `f0e1024..HEAD` (multilingual landing + front-admin/front-public i18n) via 4 parallel probes: stack smoke, front-admin i18n, front-public i18n, landing/nginx → smoke 4/4, logs clean, locale parity exact (en/es), but 8 defects found
2. Fixed (all live-verified): front-admin + front-public `i18next.server.ts` dead `i18nextOptions` block → server `getFixedT` returned raw keys (HIGH); front-admin `<Trans>` tags renumbered 0-based; change-language redirects honor `X-Forwarded-Proto` (both apps); landing `localStorage.getItem` guarded; landing mobile dock title emphasis; `default.prd.conf` deprecation note; dev nginx `:8082/health` endpoint added; front-public dead `getRequestT` export removed
3. Gates: touch-scope pass; blast-radius high (4 areas) — owner-approved by the request itself; smoke 4/4; MOD-06 registry in NEXT.md → merge_ok
**User correction:** none
**Coordination notes:** .ai.ui portion handled natively (landing page CSS/JS) — no ui-* skill chain needed for defect fixes; MOD-06 run per AI-assisted default
**Blockers / follow-ups (owner decisions needed):**
- `front-admin/tsconfig.json` / `front-public/tsconfig.json` are protected — `moduleResolution: "Node"` causes TS2307 on `remix-i18next/*` subpath imports; recommend `"Bundler"` (needs explicit approval). Baseline tsc already broken (~2393 errors, `@types/react*` missing from devDeps)
- Google sign-in button label not localized: backend-configured `buttonText` overrides `t()` on es pages (`front-public/.../user-registration/routes/index.tsx:184,297`) — needs product decision (locale-aware config vs always-translate)
- Real-browser hydration/client-side language switch unverified (no headless browser); SSR verified via curl
- Landing FOUC (English paint before es swap) — accepted, cosmetic
**Next recommended:** @ai-director - "fix tsconfig moduleResolution + add @types/react to make tsc a usable gate" (with protected-file approval)

---

## Cross-framework action (@x-director)

**Date:** 2026-07-25 (second action)
**Request:** "when user lands in the root: https://tools.datawork.top/ and the user changes the language, the selection should persist even after navigating to the public portal (portal publico)"
**Frameworks involved:** .ai
**Classified framework bucket(s):** engineering
**Routing confidence:** high
**Root cause (evidence):** Remix 2.17.2 `createCookie` unconditionally base64-JSON-encodes values (`encodeData`, `server-runtime/dist/cookies.js:101`) — the landing page writes plain `i18next=es`, which both apps silently ignored → fell back to English. Reproduced live before fixing (plain cookie → `lang="en"`).
**Executed:**
1. Replaced `i18nCookie` in `front-public/app/i18next.server.ts` and `front-admin/app/i18next.server.ts`: spread of the Remix cookie with plain-value `parse`/`serialize` overrides (first attempt — `encode`/`decode` options — provably cannot disable Remix's base64 layer; reverted)
2. Verified live: plain `i18next=es` → Spanish SSR in both apps; `change-language` now writes plain cookie; invalid + legacy base64 values fall back to English without crashing
3. Gates: smoke 4/4, touch-scope pass, blast-radius warn (in-scope)
**User correction:** none
**Coordination notes:** cookie contract now plain across landing page + both Remix apps; same attributes (Path=/, Max-Age=1y, SameSite=Lax, JS-readable)
**Blockers:** none
**Next recommended:** deploy to VPS so the fix reaches tools.datawork.top (owner action #2)

---

## Updating this file

After a significant session, refresh **Session status**, **Open owner actions**, **Repository state**, and **Where to look next**. Move long historical tables to `archives/`.
