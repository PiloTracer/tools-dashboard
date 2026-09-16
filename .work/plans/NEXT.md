# NEXT - planning backlog

**Updated:** 2026-08-14

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

---

## Next iteration — not yet opened

Template: `$AGENT_OS_SOURCE/templates/work/plans/NEXT.md.template` — instantiate the `## Current iteration - M{N}` block.
This repo's validation commands are recorded in `.cursorrules` (§ Change safety + placeholder quick map):
tests `bash bin/test.sh` · back-api lint `docker compose exec back-api bash -c "cd /app && ruff check ."` ·
back-api typecheck `docker compose exec back-api bash -c "cd /app && pyright ."`.

---

## Concept / NFR registry history

Completion records for sessions before the current iteration (2026-07-25 → 2026-08-14, 7 registries):
`.work/plans/archives/NEXT-concept-registry-history.md`.
