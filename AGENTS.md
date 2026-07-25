# AGENTS.md — Tools Dashboard (quick index)

> **Binding rules:** `.cursorrules` · **Session state:** `.work/context/HANDOFF.md` · **Backlog:** `.work/plans/NEXT.md`

Microservices admin platform: Remix frontends (`front-admin`, `front-public`), FastAPI backends (`back-api`, `back-auth`, `back-websockets`, `back-workers`), PostgreSQL/Cassandra/Redis, SeaweedFS, Docker Compose.

## Run

```bash
./bin/start.sh dev up          # start dev stack
./bin/start.sh dev             # interactive menu
bash bin/test.sh               # smoke tests (stack must be up)
./bin/start.sh prd preflight   # production compose check
```

## Context map

| Need | File |
|------|------|
| Agent rules | `.cursorrules` |
| Session / ops state | `.work/context/HANDOFF.md` |
| Tactical backlog | `.work/plans/NEXT.md` |
| Stack spec (deep) | `DOCS_TECH_STACK.md` |
| Feature work | `DOCS_CONTEXT.md` + `.work/features/<slug>/` |
| UI work | `DOCS_UI_STACK.md` + `.work.ui/context/HANDOFF_UI.md` |
| Framework skills | `$AGENT_OS_SOURCE` → `/mnt/work/Projects/.ai` |
| UI framework | `$AI_UI_SOURCE` → `/mnt/work/Projects/.ai.ui` |

## Verify changes

- Smoke: `bash bin/test.sh`
- Stack health: `./bin/start.sh dev up` → `http://localhost:8082/health`
- Per-service: `docker compose exec back-api bash -c "cd /app && pytest tests/ -q"`

## Gaps

- No approved foundation/master plan (tactical backlog only).
- UI foundation 01–04 not authored (`@ui-design-foundation greenfield`).
