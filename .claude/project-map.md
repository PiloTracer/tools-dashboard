# Project Navigation Map

## 🗺️ Where to Find Things

### Frontend Apps

#### `front-public/` - Public User Application
**Access**: http://epicdev.com/app/

**Key Directories**:
- `app/routes/` - Remix route files (kebab-case naming)
  - `app._index.tsx` → `/app/`
  - `app.features.user-registration._index.tsx` → `/app/features/user-registration`
  - Pattern: `app.<path>.tsx` creates route at `/app/<path>`

- `app/features/` - Feature modules (self-contained)
  - `user-status/` - Auth state management, session indicators
  - `user-registration/` - Sign up, login forms (routes re-export from here)
  - `progressive-profiling/` - Multi-step onboarding
  - `user-subscription/` - Pricing, subscription management
  - Each feature has: `routes/`, `ui/`, `hooks/`, `store/`, `feature.yaml`

- `app/components/` - Shared components
  - `layout/PublicLayout.tsx` - Main layout with header/footer
  - `LanguageSwitcher.tsx` - i18n language selector

- `app/utils/` - Shared utilities
  - `publicPaths.ts` - Path helpers for base path handling
  - `env.server.ts` - Server-side environment config

**File Naming**:
- Routes: Dot notation for nested paths (`app.features.user-status._index.tsx`)
- Components: PascalCase (`StatusIndicator.tsx`)
- Utilities: camelCase (`publicPaths.ts`)

---

#### `front-admin/` - Admin Dashboard
**Access**: http://epicdev.com/admin/

**Key Directories**:
- `app/routes/` - Admin routes
  - `admin._index.tsx` → `/admin/`
  - Pattern: `admin.<path>.tsx` creates route at `/admin/<path>`

- `app/features/` - Admin-specific features
  - `user-management/` - User CRUD, role assignment
  - `task-scheduler/` - Background task management

- `app/components/` - Admin UI components
  - `layout/AdminLayout.tsx` - Admin-specific layout

**Styling**: Same Tailwind setup as front-public

---

### Backend Services

#### `back-auth/` - Authentication & Session Management
**Port**: 8101 (dev), accessible via nginx at `/auth/`

**Key Files**:
- `main.py` - FastAPI app entry point, router setup
- `core/` - Core utilities
  - `config.py` - Settings (from environment)
  - `database.py` - PostgreSQL connection, session management
  - `cassandra.py` - Cassandra connection with retry logic
  - `seed_admin.py` - Default admin user creation

- `features/` - Auth feature modules
  - `user-registration/api.py` - Registration, login, email verification, OAuth callback
  - `email-auth/` - Email/password authentication
  - `google-auth/` - Google OAuth flow
  - `two-factor/` - 2FA (planned)

- `repositories/` - Data access (if not using separate services)
- `schemas/` - Pydantic request/response models
- `services/` - Business logic, external integrations

**Routes**:
- `POST /user-registration` - Create account
- `POST /user-registration/login` - Email/password login
- `POST /user-registration/verify-email` - Verify email token
- `GET /user-registration/status` - Check session status
- `POST /user-registration/logout` - End session
- `GET /user-registration/config` - Get frontend config (CSRF, OAuth URLs)
- `POST /user-registration/providers/google/callback` - OAuth callback

---

#### `back-api/` - Main Business Logic
**Port**: 8100 (dev), accessible via nginx at `/api/`

**Features**:
- `progressive-profiling/` - Collect user data in stages
- Other business features (extend as needed)

---

#### `back-postgres/` - PostgreSQL Repository Service
**Port**: Internal only

**Repositories**:
- `user_repository.py` - User CRUD, password hashing, verification tokens
- `financial_repository.py` - Financial data (planned)

**Tables** (in PostgreSQL):
- `users` - User accounts, email, password hash, verification status
- `sessions` - Active user sessions (JWT tokens)
- `verification_tokens` - Email verification, password reset tokens
- `identities` - OAuth provider links (Google, etc.)

---

#### `back-cassandra/` - Cassandra Repository Service
**Port**: Internal only

**Repositories**:
- `user_ext_repository.py` - Extended user profiles
- `application_repository.py` - Application-level data
- `config_repository.py` - Configuration storage

**Tables** (in Cassandra):
- `auth_events_by_user` - Auth event log (partition by user_id, sorted by timestamp)

---

#### `back-redis/` - Redis Utilities
**Port**: Internal only

**Modules**:
- `cache.py` - Caching helpers
- `rate_limiter.py` - Rate limiting
- `pubsub.py` - Pub/sub messaging
- `main.py` - Redis service wrapper

---

#### `back-websockets/` - WebSocket Server
**Port**: 8102 (dev), accessible via nginx at `/ws/`

**Purpose**: Real-time notifications, live updates

---

#### `back-workers/` - Background Tasks
**Technology**: Celery + Redis broker

**Tasks**:
- `backup.py` - Scheduled backups
- `cleanup.py` - Data cleanup
- `data_export.py` - User data export

---

#### `feature-registry/` - Feature Management
**Port**: 8105 (dev)

**Purpose**:
- Feature flag management
- Feature discovery (reads `feature.yaml` files)
- Dynamic feature enablement

---

### Shared Code

#### `shared/` - Common Python Code
- `models/` - Shared Pydantic models
  - `user.py` - User data models
  - `feature.py` - Feature metadata models
- `contracts/` - API contracts, shared schemas
- `security/` - Security utilities
  - `jwt.py` - JWT token generation/validation
  - `encryption.py` - Password hashing, data encryption
  - `constants.py` - Security constants

---

### Infrastructure

#### `infra/nginx/` - Reverse Proxy Config
- `default.conf` - Main nginx config
  - Routes `/app/` → front-public:3000
  - Routes `/admin/` → front-admin:3000
  - Routes `/api/` → back-api:8000
  - Routes `/auth/` → back-auth:8001
  - Routes `/ws/` → back-websockets:8010
  - Handles CORS, compression, static assets

---

### Configuration Files

#### Root Level
- `docker-compose.dev.yml` - Development environment (hot reload, volume mounts)
- `docker-compose.prod.yml` - Production environment (optimized builds)
- `.env.dev` - Development environment variables (example/template)
- `.gitignore` - Git exclusions
- `.claudeignore` - Claude Code context exclusions

#### Service Level
Each service has:
- `Dockerfile.dev` - Development Docker image
- `Dockerfile.prod` - Production Docker image
- `requirements.txt` (Python) or `package.json` (Node.js)
- `CONTEXT.md` - Service-specific documentation
- `__PROMPT.md` - AI agent instructions for that service

---

### Documentation

#### `.claude/` - Claude Code Context
- `project-map.md` - This file
- `dev-guide.md` - Developer quick reference
- `agents/` - Sub-agent configurations
  - `user-registration-agent-initial-directions.md`
  - `PROMPT-admin-signin.md`
  - `HOW-TO-USE-USER-REGISTRATION-AGENT.md`

#### `.ai/` - AI Assistant Prompts
- `__PROMPT.md` - Root-level AI instructions
- `role-cards/` - Role-specific AI prompts
- `token-guard.py` - Token usage monitoring

#### Root Documentation
- `DEVELOPER_SETUP.md` - Setup instructions
- `STACK_OPERATIONS.md` - Common operations, troubleshooting
- `FIXES_APPLIED_*.md` - Historical bug fixes
- `CONSOLE_ERRORS_FIXED_*.md` - Error resolution logs

---

## 📦 Module Dependencies

### Frontend Dependencies Flow
```
front-public/app/root.tsx
  └── components/layout/PublicLayout.tsx
        ├── features/user-status/ui/StatusIndicator.tsx
        │     └── hooks/useUserStatus.ts
        │           └── store/userStatusStore.ts
        └── features/user-status/ui/UserMenu.tsx
```

### Backend Dependencies Flow
```
back-auth/main.py
  ├── features/user-registration/api.py
  │     ├── repositories/user_repository.py
  │     ├── services/email.py
  │     ├── services/google_oauth.py
  │     └── core/cassandra.py (for event logging)
  └── core/database.py (PostgreSQL)
```

### Service Communication
```
front-public → nginx → back-auth (user session)
front-public → nginx → back-api (business logic)
back-auth → back-postgres (via repository)
back-auth → back-cassandra (event logging)
back-auth → back-redis (caching, rate limiting)
```

---

## 🎯 Finding Specific Functionality

### Authentication
- **Routes**: `back-auth/features/user-registration/api.py`
- **Frontend Forms**: `front-public/app/features/user-registration/ui/`
- **Session State**: `front-public/app/features/user-status/store/`

### User Profile Data
- **Basic Info**: PostgreSQL (`back-postgres/repositories/user_repository.py`)
- **Extended Data**: Cassandra (`back-cassandra/repositories/user_ext_repository.py`)

### Feature Flags
- **Registry**: `feature-registry/`
- **Metadata**: Each feature's `feature.yaml`

### Email Templates
- **Service**: `back-auth/services/email.py`
- **Testing**: Mailhog UI (http://localhost:8025)

### Real-time Updates
- **Server**: `back-websockets/`
- **Redis PubSub**: `back-redis/pubsub.py`

### Background Jobs
- **Workers**: `back-workers/tasks/`
- **Broker**: Redis (configured in docker-compose)

### Translations (i18n)
- **Frontend**: `front-public/public/locales/`
- **Config**: `front-public/app/i18next.server.ts`

---

## 🔍 Search Tips for Claude Code

| Looking for... | Search in... | Pattern |
|----------------|--------------|---------|
| Route handler | `app/routes/` | `*.tsx` with `export async function loader` or `action` |
| API endpoint | `features/*/api.py` | `@router.get` or `@router.post` |
| Database model | `repositories/*.py` | `class` definitions or SQL queries |
| Component | `app/components/`, `app/features/*/ui/` | PascalCase `.tsx` files |
| Configuration | `.env.dev`, `core/config.py` | `Settings` class or env vars |
| Feature metadata | `features/*/feature.yaml` | YAML files |

---

**Last Updated**: 2025-11-12
**Maintained by**: Project team
