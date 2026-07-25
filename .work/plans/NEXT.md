# NEXT - planning backlog

**Updated:** 2026-07-25

---

## Done

| Item | Artifact |
|------|----------|
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

---

## Recommended next

| Priority | Item | Notes |
|----------|------|-------|
| **🔴 1** | **Finish VPS go-live (datawork.top)** | Follow operator runbook: DNS → sync `/opt/tools-dashboard` → `sudo bash scripts/vps-deploy-datawork.sh` → verify HTTPS/admin/WS/S3 |
| 2 | Admin app-user access UI | Build UI to assign `only_specified` mode with user IDs; type bug is fixed, user-creation endpoint exists |
| 3 | Priority 1B & 1D | Public cookie audit + nginx API routing documentation table |
| 4 | Extend test suite | Add tests for remaining services (websockets, feature-registry), add frontend tests |


---

## Current iteration

*(No active iteration - run `@code-implementation plan - M1` after master plan is **Approved** and `implementation-ready: yes`.)*

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
