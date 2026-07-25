# `.work/` — project working tree

**Purpose:** All **project-specific** artifacts: plans, SPECs, ADRs, prompts, and session handoff.

**Process** (skills, standards, concepts, guides) resolves from **`$AGENT_OS_SOURCE`** (`/mnt/work/Projects/.ai`) — not vendored in this repo.

## Layout

| Path | Contents |
|------|----------|
| `.work/plans/` | Foundation docs, master plan, registries, `NEXT.md`, proposals |
| `.work/features/<slug>/` | Feature SPECs, `feature.yaml`, implementation notes |
| `.work/prompts/` | Decision questionnaires; user scratch (`initial.md` — skills ignore unless named) |
| `.work/decisions/` | ADRs (`YYYYMMDD-NNN-*.md`) |
| `.work/context/` | `HANDOFF.md` — read/write via `@session-control` |
| `.work/context/archives/` | Long-form handoff history (slim HANDOFF points here) |
| `.work/fixes/` | Error fixes and bug reports |
| `.work/implementations/` | Feature implementation logs |
| `.work/agents/` | Agent role definitions |
| `.work/docs/` | Project docs; `integration/` for vendor API cache |
| `.work/standards/` | Project-owned binding standards (from `@plan-foundation`) |
| `.work/PROTECTED_SURFACES.json` | High-blast paths for change-safety gates |
| `.work/touch-scope` | Declared file scope for current backend iteration |

## Quick pick-up

1. `.work/context/HANDOFF.md`
2. `.work/plans/NEXT.md`
3. `DOCS_TECH_STACK.md` (repo root)

Operator entry (framework): `$AGENT_OS_SOURCE/START_HERE.md`

## Bootstrap / update

Thin-client is active. Re-sync scaffold: `@deploy-basic update` (from this repo). Foundation docs **01–04**: `@plan-foundation greenfield`.
