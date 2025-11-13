# Tools Dashboard - Claude Code Context

## Project Overview
A full-stack SaaS platform with microservices architecture, featuring user authentication, progressive profiling, subscription management, and real-time capabilities.

**Status**: Active development (v0.1.0)
**Architecture**: Feature-driven microservices
**Primary Focus**: User registration, authentication, and onboarding flows

---

## Tech Stack Summary

### Frontend
- **Framework**: Remix v2.5.0 (React 18.2.0)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4
- **i18n**: react-i18next, remix-i18next
- **Build**: Vite
- **State**: Zustand (user-status store)

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy (async)
- **Auth**: JWT tokens, OAuth 2.0 (Google)
- **Email**: SMTP via environment config
- **Task Queue**: Celery with Redis broker

### Data Layer
- **Relational**: PostgreSQL 15 (user accounts, financial data)
- **NoSQL**: Cassandra 4 (auth events, time-series, extended profiles)
- **Cache/PubSub**: Redis 7

### Infrastructure
- **Containers**: Docker Compose (dev & prod configs)
- **Reverse Proxy**: nginx
- **Development**: Hot reload, volume mounts

---

## Directory Structure (High-Level)

```
tools-dashboard/
├── front-admin/          # Admin dashboard (Remix app on /admin)
├── front-public/         # Public user app (Remix app on /app)
├── back-api/             # Business logic service
├── back-auth/            # Authentication service (JWT, OAuth, sessions)
├── back-postgres/        # PostgreSQL repository layer
├── back-cassandra/       # Cassandra repository layer
├── back-redis/           # Redis utilities (cache, rate limiter, pubsub)
├── back-websockets/      # WebSocket server
├── back-workers/         # Celery background workers
├── back-gateway/         # Kong API gateway config (optional)
├── feature-registry/     # Feature flag & discovery service
├── shared/               # Shared Python models, contracts, security utils
├── infra/                # nginx configs, deployment scripts
├── .claude/              # Claude Code context & documentation
└── .ai/                  # AI-specific prompts and role cards
```

---

## Key Design Patterns

### Feature-Based Structure
Each service organizes code by feature (not by layer):
```
back-auth/features/
├── user-registration/
│   ├── api.py          # FastAPI routes
│   ├── domain.py       # Business logic
│   ├── infrastructure.py # DB/external services
│   └── feature.yaml    # Feature metadata
├── email-auth/
└── google-auth/
```

### Repository Pattern
- Data access abstracted in `back-postgres`, `back-cassandra` services
- Domain services call repositories via internal APIs or direct imports

### Configuration
- **Environment vars**: `.env.dev` (development), `.env.production` (prod)
- **Docker Compose**: Service orchestration, health checks, dependencies
- **Feature YAML**: Metadata for feature registry and documentation

### Naming Conventions
- **Routes**: Kebab-case (`user-registration`, `progressive-profiling`)
- **Python**: Snake_case files, PascalCase classes
- **TypeScript**: camelCase variables, PascalCase components
- **Docker services**: Kebab-case (`back-auth`, `front-public`)

---

## Critical Commands

### Start All Services
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Access Services
- **Public App**: http://epicdev.com/app/ (or localhost:4101)
- **Admin App**: http://epicdev.com/admin/ (or localhost:4100)
- **Auth API**: http://localhost:8101
- **Main API**: http://localhost:8100
- **Mailhog**: http://localhost:8025 (email testing)

### Rebuild Frontend
```bash
docker-compose -f docker-compose.dev.yml exec front-public npm run build
docker-compose -f docker-compose.dev.yml restart front-public
```

### View Logs
```bash
docker-compose -f docker-compose.dev.yml logs -f front-public
docker-compose -f docker-compose.dev.yml logs -f back-auth
```

### Database Access
```bash
# PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db

# Cassandra
docker-compose -f docker-compose.dev.yml exec cassandra cqlsh

# Redis
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

---

## Environment Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev without Docker)
- Python 3.11+ (for local dev without Docker)

### First-Time Setup
1. Copy `.env.dev` and configure:
   - `JWT_SECRET_KEY` (generate with `openssl rand -base64 32`)
   - `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD`
   - SMTP settings for email (or use Mailhog for local)

2. Add to `/etc/hosts` (for nginx routing):
   ```
   127.0.0.1 epicdev.com
   ```

3. Start services:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. Wait for health checks (~30 seconds for Cassandra)

### Default Admin User
- **Email**: `admin@example.com`
- **Password**: `Admin123!ChangeMe`
- Created automatically on first startup

---

## Current Development Priorities

1. **User Registration & Auth** ✅ (90% complete)
   - Email/password registration ✅
   - Google OAuth ✅
   - Email verification ✅
   - JWT session management ✅
   - User status indicators ✅

2. **Hydration Fixes** 🔄 (In progress)
   - Resolved StatusIndicator hydration errors
   - Resolved UserMenu hydration errors
   - Testing in progress

3. **Progressive Profiling** 📋 (Next up)
   - Multi-step onboarding flow
   - Conditional field collection
   - Progress tracking

4. **Admin Dashboard** 📋 (Planned)
   - User management
   - Role-based access control (RBAC)
   - Task scheduler

---

## Known Issues & Gotchas

### React Hydration
- **Issue**: Server/client HTML mismatch
- **Solution**: Use `useState` + `useEffect` pattern for dynamic auth content
- **See**: `StatusIndicator.tsx`, `UserMenu.tsx`

### Asset Loading
- **Issue**: CSS/JS 404 errors
- **Cause**: Incorrect nginx routing or Vite publicPath
- **Solution**: nginx must pass full `/app/` path to front-public
- **Config**: `infra/nginx/default.conf`

### Cassandra Startup
- **Issue**: Connection refused on first startup
- **Cause**: Cassandra takes ~20s to fully start
- **Solution**: Health check with retries, exponential backoff in `back-auth/core/cassandra.py`

### CORS in Development
- **Issue**: Cross-origin requests blocked
- **Solution**: All apps route through nginx on port 80
- **Don't**: Access apps directly on their ports (4100, 4101, 8100, etc.)

---

## Context File Structure

This project uses a hierarchical context system to help Claude understand the architecture at different levels:

### Root Level
- **CLAUDE_CONTEXT.md** (this file): High-level architecture, tech stack, commands, and project overview
- **DEVELOPER_SETUP.md**: First-time setup instructions
- **STACK_OPERATIONS.md**: Common operations and troubleshooting

### Service Level
Each service directory contains a `CONTEXT.md` file with:
- Service-specific technology details
- AI Context Guidelines (what to do/not do in this service)
- Critical constraints (timeouts, connection pools, security)
- Service boundaries and responsibilities

**Example**: `back-api/CONTEXT.md` emphasizes "NEVER implement database logic here"

### Feature Level
Each feature directory contains a `feature.yaml` file with:
- Feature contract definition
- API endpoints and schemas
- Dependencies and version requirements
- Cross-service integration points

**Example**: `back-api/features/user-registration/feature.yaml`

### Agent Level
The `.claude/agents/` directory contains specialized sub-agent configurations:
- **Agent YAML files**: Define specialized agents for specific domains
- **Feature context files**: Provide detailed context for complex features
- **Ready-to-use prompts**: Pre-written prompts for common tasks
- **Usage guides**: Instructions for working with agents

**See**: `.claude/agents/README.md` for complete agent documentation

### When to Read Which Context

| Task | Read These Context Files |
|------|-------------------------|
| Project overview | `CLAUDE_CONTEXT.md` |
| Working on specific service | `CLAUDE_CONTEXT.md` + `<service>/CONTEXT.md` |
| Implementing feature | All of above + `<service>/features/<feature>/feature.yaml` |
| Cross-service feature | All of above + `.claude/agents/CROSS_SERVICE_FEATURES.md` |
| Using sub-agents | `.claude/agents/README.md` |

---

## Documentation Index

- **Architecture**: See individual `CONTEXT.md` files in each service directory
- **API Docs**: Feature YAML files (`features/*/feature.yaml`)
- **Setup**: `DEVELOPER_SETUP.md`, `STACK_OPERATIONS.md`
- **Fixes Applied**: `FIXES_APPLIED_*.md`, `CONSOLE_ERRORS_FIXED_*.md`
- **Agent System**: `.claude/agents/README.md` for sub-agent workflows and templates

---

## Team Conventions

- **Commits**: Use semantic prefixes (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Branches**: `feature/`, `bugfix/`, `hotfix/` prefixes
- **PR Reviews**: Required for `main` branch
- **Environment**: Never commit `.env` files with real secrets
- **Docker**: Always use `docker-compose.dev.yml` for local development

---

## Quick Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| Service won't start | `docker-compose logs <service>` | Check health of dependencies |
| 404 on API routes | nginx config | Verify `location` blocks in `infra/nginx/default.conf` |
| Hydration errors | Browser console | Add hydration check pattern |
| DB connection fails | Service health | Wait for health checks, check credentials |
| Email not sending | Mailhog UI | http://localhost:8025 |

---

## Failed Fixes

### Adding "type": "module" to package.json

Usually in response to this exception or warning:

```
Reparsing as ES module because module syntax was detected. This incurs a performance overhead.
To eliminate this warning, add "type": "module" to /app/package.json.
```

Adding the "module" as type, resulted in a new exception:

```
This file is being treated as an ES module because it has a '.js' file extension and '/app/package.json' contains "type": "module".    
 To treat it as a CommonJS script, rename it to use the '.cjs' file extension. [plugin css-file]
```

Suggested: to ignore the warning that initiated the change.

---

**Last Updated**: 2025-11-12
**Claude Code Version**: Latest
**Project Version**: 0.1.0-dev
