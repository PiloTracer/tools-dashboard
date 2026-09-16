# NEXT_SOC — SOC planning backlog

**Status:** Active · **Updated:** 2026-09-15 · **Needs:** nothing (no SOC assessment has run yet)

---

## Done

| Item | Artifact |
|------|----------|
| SOC bootstrap | `.work.soc/` skeleton (thin-client; no assessment has run yet) |

---

## Blocked on owner

| # | Item | Notes |
|---|------|-------|
| - | (none) | |

---

## Recommended next

| Priority | Item | Notes |
|----------|------|-------|
| **0** | Review `.work.soc/context/HANDOFF_SOC.md` | Orient on current state |
| **1** | Run first SOC assessment | `@soc-director - scan <target>` |
| **2** | Verify SOC skills resolve from `$SOC_SOURCE` | Run `@soc-session start`; confirm `$SOC_SOURCE/skills/README.md` loads (no local `.ai.soc/`) |

---

## Current SOC iteration

```markdown
## Current iteration — SOC-{N}: <iteration name>

**Status:** planning | in-progress | complete
**Started:** YYYY-MM-DD

### In scope
- …

### Out of scope
- …

### Tasks
| ID | Description | Files | Status | Notes |
|----|-------------|-------|--------|-------|
| SOC-{N}-T1 | … | … | pending | |

### Owner blockers
- none

### Done this iteration
| Task | Completed | Notes |
|------|-----------|-------|
```

---

## Next action

`@soc-session start` then `@soc-director - scan <target>` — nothing has been scanned yet.
