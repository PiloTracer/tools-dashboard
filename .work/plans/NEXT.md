# NEXT - planning backlog

**Updated:** YYYY-MM-DD

---

## Done

| Item | Artifact |
|------|----------|
| Bug fixes (3) | Type fix `013` migration, user-status auth unblock, debug print cleanup |
| OAuth client_secret verification | `verify-client-credentials` endpoint + token endpoint integration |
| Admin session hardening (Priority 1A) | Signed Remix session storage; all admin routes migrated |
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
| **1** | Admin user-creation endpoint | `back-api/features/user-management/api.py` — no `POST /admin/users` exists yet; users can only self-register |
| **2** | Admin app-user access UI | Build UI to assign `only_specified` mode with user IDs; the type bug is now fixed |
| **3** | Priority 1B & 1D | Public cookie audit + nginx API routing documentation table |

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
