# .ai Directory Map

This document describes the purpose of each directory. Use this to know where to place or find files during operations.

---

## Directory Purposes

### `agents/`
Agent role definitions and capabilities. Each agent type has specific skills and contexts.
- **Place here**: New agent definitions (e.g., `agent-python.md`, `db-worker.md`)

### `features/`
Feature-specific documentation, specs, and resources. Each feature gets its own subdirectory.
- **Place here**: Feature specs, user stories, technical designs, screenshots, SQL seeds
- **Structure**: `features/{feature-name}/` (e.g., `features/app-library/`, `features/user-management/`)

### `plans/`
Implementation plans and roadmaps. Created before starting work on a feature or major task.
- **Place here**: New plans, phase breakdowns, status tracking documents
- **Naming**: `{feature-name}.md` or `{feature-name}-{phase}.md`

### `implementations/`
Records of completed implementations. Created after finishing a feature or significant work.
- **Place here**: Implementation summaries, what was built, decisions made
- **Naming**: `{FEATURE_NAME}_IMPLEMENTATION.md` or `PHASE_{N}_{FEATURE}_{DATE}.md`

### `fixes/`
Bug fix documentation and error resolutions.
- **Place here**: Error analysis, fix descriptions, regression notes
- **Naming**: `{feature}-{issue}.md` or `ERROR_FIXES_{DATE}.md`

### `prompts/`
Pre-written conversation starters for resuming work on specific features.
- **Place here**: Context prompts to quickly onboard to a feature
- **Naming**: `{feature-name}-starter.md`

### `decisions/`
Architectural decision records (ADRs) explaining why choices were made.
- **Place here**: Design decisions, trade-off analysis, rationale
- **Naming**: `ADR-{number}-{title}.md`

---

## Root-Level Files

| File | Purpose |
|------|---------|
| `CONVENTIONS.md` | Code style and architectural patterns |
| `dev-guide.md` | Development setup and common commands |
| `project-map.md` | Codebase navigation and file locations |
| `SESSION_STARTERS.md` | Quick start templates for common tasks |
| `settings.local.json` | Local IDE settings |

---

## Quick Reference

| Task | Directory |
|------|-----------|
| Creating a plan | `plans/` |
| Documenting a completed feature | `implementations/` |
| Writing feature specs | `features/{name}/` |
| Recording a bug fix | `fixes/` |
| Adding an agent role | `agents/` |
| Writing a session starter | `prompts/` |
| Recording a design decision | `decisions/` |
