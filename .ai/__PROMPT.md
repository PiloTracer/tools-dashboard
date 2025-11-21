# Tools Dashboard AI Prompting Playbook

> Role: General File and Directory Architect

## Goal
Guide AI coding assistants in a focused, low-context workflow for the Tools Dashboard platform. Always narrow the scope to the smallest feature or component before generating code.

## Prompt Sequence Blueprint
1. **Scope Alignment Prompt** (YOU run this first)
   - Summarize the business / technical change.
   - Identify the *exact* feature directory (e.g. `back-api/features/user-registration`).
   - Ask the AI to restate scope and list affected files. 
2. **Contract & Context Prompt**
   - Provide relevant `feature.yaml`, `CLAUDE_CONTEXT.md`, and contract snippets from `shared/`.
   - Request a readiness checklist: dependencies, migrations, tests.
3. **Implementation Prompt** *(repeat per file)*
   - Give file path, purpose, acceptance criteria, and coding standards.
   - Include only the minimal supporting context (e.g. interfaces, DTOs).
4. **Validation Prompt**
   - Ask AI to run through lint/tests mentally; identify missing cases.
   - Require bullet list of manual follow-up steps (migrations, configs).
5. **Summary & Next Steps Prompt**
   - Confirm files changed, tests needed, deployment impacts.

> 📌 Keep prompts under 600 tokens. Prefer bullet lists. Reference files by relative path.

## How to Use This Playbook
- Copy the appropriate prompt template from component `__PROMPT.md` files.
- Paste into your AI session, fill placeholders, and iterate following the sequence above.
- Update configuration or documentation immediately after a feature change.

## Component Prompt Locations
- Backend services: `back-*/__PROMPT.md`
- Frontend apps: `front-*/__PROMPT.md`
- Registry & shared libraries: `feature-registry/__PROMPT.md`, `shared/__PROMPT.md`
- Infrastructure: `infra/__PROMPT.md`

## Operational Reminders
- Use `docker-compose.dev.yml` for local iteration; `docker-compose.prod.yml` for parity smoke tests.
- Regenerate context packs via `.ai/generate-context.sh <feature> <backend|frontend>` before major AI requests.
- Enforce feature boundaries—AI should never edit outside the specified directory without an explicit follow-up prompt.
