# AGENTS.md — Tools Dashboard

## What this project is

Tools Dashboard is a modern administrative dashboard platform with a microservices architecture. It has a public-facing app, an admin panel, a FastAPI backend, authentication service, WebSocket server, background workers, and supports PostgreSQL, Cassandra, Redis, and SeaweedFS.

## Tech Stack

- **Frontend:** Remix (React 18 + TypeScript + Tailwind CSS)
- **Backend:** FastAPI (Python 3.9+)
- **Databases:** PostgreSQL 15, Cassandra 4, Redis 7
- **Storage:** SeaweedFS
- **Queue:** Celery
- **Proxy:** Nginx
- **Orchestration:** Docker Compose

## How to run this project

```bash
# Start the dev stack
./bin/start.sh dev up

# Interactive menu
./bin/start.sh dev

# Backup everything
./bin/start.sh dev backup

# Restore from backup
./bin/start.sh dev restore

# Stop
./bin/start.sh dev down
```

## Directory structure

```
├── front-admin/              # Admin dashboard (Remix)
├── front-public/             # Public app (Remix)
├── back-api/                 # Main API (FastAPI, port 8000)
├── back-auth/                # Auth service (FastAPI, port 8001)
├── back-websockets/          # WebSocket server (port 8010)
├── back-workers/             # Celery background workers
├── back-postgres/            # Postgres init & migrations
├── back-cassandra/           # Cassandra init & schemas
├── back-redis/               # Redis config
├── back-gateway/             # API gateway
├── feature-registry/         # Feature registry service
├── infra/                    # Nginx, Docker configs
├── shared/                   # Shared utilities
├── seaweedfs/                # File storage config
├── bin/                      # Start/stop scripts
├── .ai/                      # Agent OS framework (skills, standards, docs)
└── .work/                    # Project working tree (plans, SPECs, ADRs, handoff, feature docs)
```

## Key documentation

| File | What it covers |
|------|---------------|
| `README.md` | Project overview, getting started |
| `DOCS_CONTEXT.md` | Architecture context for AI conversations |
| `DOCS_TECH_STACK.md` | Full technical stack specification |
| `DOCS_UI_STACK.md` | UI stack notes |
| `.cursorrules` | Agent rules and workflow (all tokens filled) |
| `.ai/START_HERE.md` | Agent OS operator entry point |
| `.work/README.md` | `.work/` layout and placeholders |
| `.work/context/HANDOFF.md` | Session handoff state |
| `.work/plans/NEXT.md` | Planning backlog |

## Feature documentation

Feature specs and docs are in these locations:

- **Primary:** `.work/features/<slug>/` — feature.yaml + README.md per feature
- **In-code:** `back-api/features/<slug>/feature.yaml`, `front-public/app/features/<slug>/`

## How to verify changes

- No centralized test suite exists at the repo root.
- Per-service testing: run inside the Docker container for the service.
- Stack health: `./bin/start.sh dev up` then check http://localhost:8082/health endpoints.
- The script has preflight checks: `./bin/start.sh dev preflight`.

## Known gaps

- `.work/` was bootstrapped as a skeleton; foundation docs 01–04 and a master plan have not been created yet.

## Migration notes

- `.ai.bak/` contents were properly migrated into `.work/` subdirectories on 2025-06-11.
- `.claude/` was migrated to `.work/` and merged into `.work/features/` on 2025-06-11.
- `.ai.bak/` is now safe to remove (you will do it manually).
