# NEXT - planning backlog

**Updated:** YYYY-MM-DD

---

## Done

| Item | Artifact |
|------|----------|
| Bug fixes (3) | Type fix `013` migration, user-status auth unblock, debug print cleanup |
| OAuth client_secret verification | `verify-client-credentials` endpoint + token endpoint integration |
| Admin session hardening (Priority 1A) | Signed Remix session storage; all admin routes migrated |
| Admin user-creation endpoint | `POST /admin/users` with email/password + OAuth support |
| Create User UI | Tailwind-styled form at `/admin/features/user-management/create` |
| Session expiry redirect | Admin root loader redirects expired sessions to sign-in |
| Test suite architecture | pytest per service + smoke tests + `bin/test.sh` + start.sh wiring |
| Agent OS bootstrap | `.work/` skeleton, `.cursorrules` from template |

---

## Blocked on owner

| # | Item | Notes |
|---|------|-------|
| - | (none) | |

---

## Recommended next

| Priority | Item | Notes |
|----------|------|-------|
| **1** | Admin app-user access UI | Build UI to assign `only_specified` mode with user IDs; type bug is fixed, user-creation endpoint exists |
| **2** | Priority 1B & 1D | Public cookie audit + nginx API routing documentation table |
| **3** | Extend test suite | Add tests for remaining services (websockets, feature-registry), add frontend tests |

---

## Current iteration

*(No active iteration - run `@code-implementation plan - M1` after master plan is **Approved** and `implementation-ready: yes`.)*

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
- [ ] Tests: `REPLACE:TEST_COMMAND` (per `.cursorrules`)
- [ ] Lint: `REPLACE:LINT_COMMAND`
- [ ] Type: `REPLACE:TYPECHECK_COMMAND`

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
