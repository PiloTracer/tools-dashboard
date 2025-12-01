# Tools Dashboard - Technical Stack Specification

**Version**: 1.0.0
**Last Updated**: 2025-11-20

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Stack](#frontend-stack)
3. [Backend Stack](#backend-stack)
4. [Data Layer](#data-layer)
5. [Infrastructure](#infrastructure)
6. [Security & Authentication](#security--authentication)
7. [Development Tools](#development-tools)
8. [Deployment & DevOps](#deployment--devops)

---

## Architecture Overview

### Architectural Pattern
**Microservices with Feature-Focused Development**

- Modular, self-contained features with clear boundaries
- Service-oriented architecture with specialized responsibilities
- API Gateway pattern for routing and security
- Event-driven communication via Redis pub/sub
- Separated data concerns (PostgreSQL, Cassandra, Redis)

### Service Topology

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                      │
│           (Port 80/8082 HTTP, 443/8443 HTTPS)               │
└─────────────────┬──────────────────────┬────────────────────┘
                  │                      │
      ┌───────────┴──────────┐  ┌───────┴──────────┐
      │   front-admin        │  │   front-public   │
      │   (Remix)            │  │   (Remix)        │
      │   Port 3000          │  │   Port 3000      │
      └──────────┬───────────┘  └────────┬─────────┘
                 │                       │
                 └───────────┬───────────┘
                             │
         ┌───────────────────┼────────────────────┐
         │                   │                    │
    ┌────▼──────┐    ┌──────▼─────┐    ┌────────▼────────┐
    │ back-api  │    │ back-auth  │    │ back-websockets │
    │ (FastAPI) │    │ (FastAPI)  │    │ (FastAPI)       │
    │ Port 8000 │    │ Port 8001  │    │ Port 8010       │
    └─────┬─────┘    └──────┬─────┘    └────────┬────────┘
          │                 │                    │
          │         ┌───────┴────────┐          │
          │         │  back-workers  │          │
          │         │  (Celery)      │          │
          │         └───────┬────────┘          │
          │                 │                    │
     ┌────┴─────────────────┴────────────────────┴────┐
     │                                                 │
┌────▼────────┐  ┌──────────────┐  ┌────────────┐   │
│ PostgreSQL  │  │  Cassandra   │  │   Redis    │   │
│ (Port 5432) │  │  (Port 9042) │  │ (Port 6379)│   │
└─────────────┘  └──────────────┘  └────────────┘   │
                                                      │
     ┌────────────────────┐    ┌──────────────┐     │
     │ feature-registry   │    │  SeaweedFS   │     │
     │ (FastAPI:8005)     │    │  (S3 API)    │◄────┘
     └────────────────────┘    └──────────────┘

     ┌────────────────────┐
     │     MailHog        │
     │   (Dev Email)      │
     │   Port 8026        │
     └────────────────────┘
```

---

## Frontend Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Remix** | 2.5.0 | Full-stack React framework with SSR |
| **React** | 18.2.0 | UI component library |
| **React DOM** | 18.2.0 | DOM rendering |
| **TypeScript** | 5.3.0 | Type-safe JavaScript |
| **Vite** | Latest | Build tool and dev server |

### Styling & UI

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.13 | Utility-first CSS framework |
| **PostCSS** | 8.4.38 | CSS processing |
| **Autoprefixer** | 10.4.18 | Browser compatibility |

### Internationalization (i18n)

| Technology | Version | Purpose |
|------------|---------|---------|
| **i18next** | 23.7.6 | Internationalization framework |
| **react-i18next** | 13.5.0 | React integration for i18next |
| **remix-i18next** | 6.4.1 | Remix integration for i18next |
| **i18next-browser-languagedetector** | 7.2.0 | Browser language detection |
| **i18next-http-backend** | 2.4.2 | HTTP backend loader |
| **i18next-fs-backend** | 2.3.1 | File system backend (SSR) |
| **accept-language-parser** | 1.5.0 | Parse Accept-Language headers |

### Validation & Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| **Zod** | 3.22.4 | Schema validation |
| **isbot** | 4.x | Bot detection |

### Frontend Configuration

#### Remix Configuration
```typescript
// remix.config.ts
{
  publicPath: "/app/build/",  // Public app
  publicPath: "/admin/build/", // Admin app
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
    v3_singleFetch: true,
    v3_lazyRouteDiscovery: true
  }
}
```

#### Vite Configuration
- Source maps enabled for debugging
- Path alias: `~` → `./app`
- ES module output
- Hot Module Replacement (HMR)

### Frontend Standards

- **Accessibility**: WCAG 2.1 compliant
- **Responsive**: Mobile-first design
- **Type Safety**: Strict TypeScript with no `any` types
- **Components**: Functional components with hooks
- **Routing**: File-based routing via Remix
- **Data Loading**: Server-side via loaders/actions
- **State Management**: Remix conventions (no Redux/Zustand)
- **Testing**: (Testing framework to be determined)

---

## Backend Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.110.0 | Modern async web framework |
| **Uvicorn** | 0.29.0 | ASGI server |
| **Python** | 3.11 | Programming language |

### Backend Services

#### 1. back-api (Main Business Logic)

**Port**: 8000 (internal), 8100 (external)

**Dependencies**:
```python
fastapi==0.110.0
uvicorn==0.29.0
pydantic[email]>=2.0.0
httpx>=0.24.0
asyncpg>=0.29.0
cassandra-driver>=3.28.0
boto3>=1.40.0          # AWS S3 client (SeaweedFS)
Pillow>=12.0.0         # Image processing
python-multipart>=0.0.6 # File uploads
bcrypt>=4.0.0          # Password hashing
sqlalchemy[asyncio]>=2.0.0  # ORM with async
```

**Responsibilities**:
- Business logic orchestration
- Feature routing
- Service coordination
- API contract enforcement
- No direct database operations
- No authentication logic

**Features**:
- user-registration
- progressive-profiling
- user-subscription
- user-status

---

#### 2. back-auth (Authentication Service)

**Port**: 8001 (internal), 8101 (external)

**Dependencies**:
```python
fastapi==0.110.0
authlib==1.3.0         # OAuth2 client
pyjwt==2.8.0           # JWT encoding/decoding
python-jose[cryptography]==3.3.0  # JWT validation
passlib[bcrypt]==1.7.4  # Password hashing
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
cassandra-driver==3.29.1
aiosmtplib==1.1.6      # Async email sending
pydantic-settings==2.1.0
email-validator==2.2.0
httpx==0.27.0
psycopg2-binary==2.9.9
uvicorn==0.29.0
bcrypt==4.0.1
```

**Responsibilities**:
- Google OAuth 2.0 authentication
- Email/password authentication
- Two-factor authentication (2FA)
- JWT token generation and validation
- Session management
- Password security (bcrypt + HaveIBeenPwned)
- User registration workflow
- Email verification

**Configuration**:
```env
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
GOOGLE_OAUTH_SCOPES=openid email profile
JWT_SECRET_KEY
JWT_ALGORITHM=HS256
SESSION_COOKIE_NAME=td_session
```

**Features**:
- google-auth
- email-auth
- two-factor

---

#### 3. back-websockets (Real-Time Communication)

**Port**: 8010 (internal), 8102 (external)

**Dependencies**:
```python
fastapi==0.110.0
uvicorn==0.29.0
```

**Responsibilities**:
- WebSocket connections
- Real-time event broadcasting
- Redis pub/sub integration
- Connection state management
- Rate limiting (10 messages/second/user)
- Max message size: 128KB

**Integration**:
- Subscribes to Redis channels
- Forwards events to connected clients
- JWT authentication via back-auth

---

#### 4. back-workers (Background Tasks)

**Port**: None (internal only)

**Dependencies**:
```python
celery==5.3.6
redis==5.0.1
```

**Responsibilities**:
- Asynchronous task processing
- Scheduled jobs (backup, cleanup, export)
- Long-running operations
- Email sending queues
- File processing

**Task Broker**: Redis
**Result Backend**: Redis

---

#### 5. feature-registry (Feature Catalog)

**Port**: 8005 (internal), 8105 (external)

**Dependencies**:
```python
fastapi==0.110.0
uvicorn==0.29.0
sqlalchemy (implied)
```

**Responsibilities**:
- Feature version tracking
- Dependency resolution
- Contract validation
- Application registration
- Audit trail
- Feature discovery

---

#### 6. back-postgres (PostgreSQL Service)

**Port**: None (internal only)

**Responsibilities**:
- User account management
- Financial data storage
- Structured relational data
- Repository pattern implementation
- Alembic migrations

---

#### 7. back-cassandra (Cassandra Service)

**Port**: None (internal only)

**Responsibilities**:
- Extended user profiles
- Configuration data
- Time-series data
- High-volume event storage
- CQL query implementation
- TTL management

---

### Backend Architecture Patterns

#### Feature Structure
```
back-api/features/<feature-name>/
├── feature.yaml          # Contract definition
├── api.py               # FastAPI routers
├── domain.py            # Business logic (pure functions)
└── infrastructure.py    # External service integration
```

#### Separation of Concerns

1. **api.py**: Route definitions, request/response handling
2. **domain.py**: Business logic, no I/O operations, pure functions
3. **infrastructure.py**: Database calls, HTTP requests, external APIs

#### Data Access Pattern

- **Repository Pattern**: All database operations in dedicated services
- **No Direct DB Access**: back-api never queries databases directly
- **Service Communication**: HTTP between services

---

## Data Layer

### 1. PostgreSQL

**Version**: 15
**Image**: `postgres:15`
**Port**: 5432 (internal), 55432 (external)

**Configuration**:
```env
POSTGRES_DB=main_db
POSTGRES_USER=user
POSTGRES_PASSWORD=pass
DATABASE_URL=postgresql://user:pass@postgresql:5432/main_db
```

**Data Stored**:
- User accounts (users table)
- Authentication credentials
- Financial records
- Subscription data
- Relational structured data

**Health Check**:
```bash
pg_isready -U user -d main_db
```

**Connection**:
- Driver: `asyncpg` (async), `psycopg2-binary` (sync)
- ORM: SQLAlchemy 2.0 with async support
- Pooling: SQLAlchemy connection pooling

**Memory Limit**: 512MB

---

### 2. Apache Cassandra

**Version**: 4
**Image**: `cassandra:4`
**Port**: 9042 (internal), 39142 (external)

**Configuration**:
```env
CASSANDRA_CLUSTER_NAME=tools_cluster
CASSANDRA_CONTACT_POINTS=cassandra
CASSANDRA_KEYSPACE=tools_dashboard
```

**Data Stored**:
- Extended user profiles
- User preferences and configuration
- Time-series event data
- High-volume metadata
- Session data with TTL

**Health Check**:
```bash
cqlsh -e 'describe cluster'
```

**Connection**:
- Driver: `cassandra-driver==3.29.1`
- Consistency Level: LOCAL_QUORUM
- Retry Policy: Exponential backoff

**Best Practices**:
- Use prepared statements for all queries
- Partition keys by user_id or tenant_id
- Clustering keys by timestamp (descending)
- Set appropriate TTLs for ephemeral data
- Avoid secondary indexes

**No Memory Limit** (default Cassandra requirements)

---

### 3. Redis

**Version**: 7-alpine
**Image**: `redis:7-alpine`
**Port**: 6379 (internal), 6380 (external)

**Configuration**:
```env
REDIS_URL=redis://redis:6379/0
```

**Data Stored**:
- Cache (DB 0)
- Session store (DB 1)
- Rate limiting counters
- Pub/sub channels
- Celery task queue

**Health Check**:
```bash
redis-cli ping
```

**Connection**:
- Driver: `redis==5.0.1`
- Async support: `aioredis` (integrated in redis-py 5.x)

**Configuration File**: `back-redis/redis.conf`

**Use Cases**:

1. **Caching**:
   - Key pattern: `{service}:{resource}:{id}:v{version}`
   - TTL: 5 minutes (default)
   - Invalidation: Pub/sub pattern

2. **Pub/Sub**:
   - Channel pattern: `{feature}:events:{user_id}`
   - Example: `subscription:events:user_123`

3. **Rate Limiting**:
   - Key pattern: `rate:{endpoint}:{user_id}`
   - Sliding window algorithm

4. **Sessions**:
   - Key pattern: `session:{session_id}`
   - TTL: 7 days (604800 seconds)

**Memory Limit**: 256MB

---

### 4. SeaweedFS (Object Storage)

**Version**: Latest
**Image**: `chrislusf/seaweedfs`

**Ports**:
- 8333: S3 API
- 9333: Master server
- 8888: Filer HTTP interface

**Configuration**:
```bash
server -s3 -filer -dir=/data -volume.max=10
  -s3.config=/etc/seaweedfs/s3-config.json
  -master.volumeSizeLimitMB=1024
  -master.defaultReplication=000
  -s3.domainName=localhost
```

**Data Stored**:
- User uploaded files
- Profile images
- Document attachments
- Generated reports

**S3 Compatibility**:
- boto3 client for Python
- AWS SDK compatible
- Bucket: `/buckets/`

**Access**:
- Public URL: `http://epicdev.com/storage/`
- Proxied via Nginx to Filer (port 8888)

**Memory Limit**: 256MB

---

## Infrastructure

### Reverse Proxy (Nginx)

**Version**: `nginx:alpine`
**Ports**:
- 80/8082 (HTTP)
- 443/8443 (HTTPS)

**Configuration**: `infra/nginx/default.conf`

**Routing**:

| Path | Backend | Purpose |
|------|---------|---------|
| `/admin/` | front-admin:3000 | Admin dashboard |
| `/admin/build/` | front-admin:3000 | Admin static assets |
| `/app/` | front-public:3000 | Public dashboard |
| `/app/locales/` | front-public:3000 | i18n translations |
| `/oauth/` | front-public:3000 | OAuth endpoints |
| `/.well-known/` | front-public:3000 | JWKS, OpenID config |
| `/build/` | Dynamic (referer-based) | Static assets routing |
| `/api/` | back-api:8000 | Business logic API |
| `/auth/` | back-auth:8001 | Authentication API |
| `/ws/` | back-websockets:8010 | WebSocket connections |
| `/storage/` | seaweedfs:8888 | File storage |

**Features**:
- Dynamic routing based on `Referer` header
- WebSocket upgrade support
- File upload limit: 10MB
- JWKS caching (1 hour)
- Graceful fallback for missing assets

**Memory Limit**: 128MB

---

### Containerization

**Technology**: Docker + Docker Compose
**Compose File**: `docker-compose.dev.yml`

**Container Strategy**:
- Development: Hot reload via volume mounts
- Production: Multi-stage builds, optimized images

**Base Images**:
- Python services: `python:3.11-slim`
- Node services: `node:18-alpine` or `node:20-alpine`
- Databases: Official images (postgres:15, cassandra:4, redis:7-alpine)

**Development Volumes**:
```yaml
volumes:
  front_admin_node_modules:
  front_public_node_modules:
  postgres_data:
  redis_data:
  cassandra_data:
  seaweed-data:
```

**Health Checks**:
- PostgreSQL: `pg_isready -U user -d main_db`
- Redis: `redis-cli ping`
- Cassandra: `cqlsh -e 'describe cluster'`
- back-auth: `curl -f http://localhost:8001/health`

**Service Dependencies**:
```yaml
back-api:
  depends_on:
    postgresql: {condition: service_healthy}
    redis: {condition: service_healthy}
    cassandra: {condition: service_healthy}
```

**Memory Limits**:
- nginx-proxy: 128MB
- front-admin: 512MB
- front-public: 512MB
- back-api: 768MB
- back-auth: 512MB
- back-websockets: 256MB
- back-workers: 512MB
- back-postgres-service: 256MB
- back-cassandra: 256MB
- feature-registry: 512MB
- redis: 256MB
- postgresql: 512MB
- mailhog: 128MB
- seaweedfs: 256MB

---

### Development Environment

**Email Testing**: MailHog v1.0.1
**Port**: 8026 (web UI)
**SMTP**: Port 1025 (internal)

**Environment Variables**: `.env` file
```env
PUBLIC_APP_BASE_URL=http://epicdev.com/app
BACK_AUTH_BASE_URL=http://back-auth:8001
SESSION_COOKIE_NAME=td_session
JWT_SECRET_KEY=your-secret-key-change-in-production-please
DEFAULT_ADMIN_EMAIL=admin@example.com
```

**Hot Reload**:
- Python services: `uvicorn --reload`
- Node services: Vite HMR

---

## Security & Authentication

### Authentication Methods

1. **Google OAuth 2.0**
   - Provider: Google Identity Platform
   - Library: `authlib==1.3.0`
   - Scopes: openid, email, profile
   - Configuration: Environment variables

2. **Email/Password**
   - Password hashing: bcrypt (cost factor 12)
   - Validation: HaveIBeenPwned API integration
   - Min password length: 12 characters
   - Email verification required

3. **Two-Factor Authentication (2FA)**
   - TOTP-based (Time-based One-Time Password)
   - Backup codes provided
   - Enforced for admin accounts

### Token Management

**JWT Tokens**:
- Algorithm: HS256
- Access Token TTL: 15 minutes
- Refresh Token TTL: 7 days
- Refresh token rotation: Single-use tokens

**Session Cookies**:
- Name: `td_session`
- SameSite: Lax
- Secure: true (production), false (development)
- HttpOnly: true
- Max Age: 7 days (604800 seconds)

**CSRF Protection**:
- CSRF token in cookies
- Max age: 15 minutes (900 seconds)
- Validated on state-changing operations

### Security Headers

```nginx
# Nginx configuration
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Password Security

- bcrypt with salt rounds: 12
- HaveIBeenPwned breach check on registration
- Password strength meter on client
- Mandatory password reset for compromised accounts

### Rate Limiting

- Implementation: Redis-based sliding window
- WebSocket: 10 messages/second/user
- API: Configurable per endpoint
- Login attempts: 5 per 15 minutes

---

## Development Tools

### Code Quality

- **Linting**: (To be configured - eslint, pylint/flake8)
- **Formatting**: (To be configured - prettier, black)
- **Type Checking**: TypeScript strict mode, mypy for Python

### Version Control

- **Git**: Version control system
- **Branch**: main (primary)
- **Ignored Files**: `.gitignore`, `.dockerignore`, `.claudeignore`

### API Documentation

- **FastAPI**: Automatic OpenAPI/Swagger docs
- **Endpoints**:
  - `/docs` - Swagger UI
  - `/redoc` - ReDoc UI
  - `/openapi.json` - OpenAPI schema

### Development Commands

```bash
# Start stack
docker compose -f docker-compose.dev.yml up --build

# Rebuild single service
docker compose -f docker-compose.dev.yml up --build <service>

# View logs
docker compose -f docker-compose.dev.yml logs -f <service>

# Clean everything
docker compose -f docker-compose.dev.yml down --volumes --remove-orphans

# Access services
# Public: http://localhost:8082/app/
# Admin: http://localhost:8082/admin/
# MailHog: http://localhost:8026
```

---

## Deployment & DevOps

### Environment Configurations

**Development**: `docker-compose.dev.yml`
- Hot reload enabled
- Volume mounts for live code updates
- Debug logging
- MailHog for email testing

**Production**: `docker-compose.prod.yml` (assumed)
- Optimized builds
- No volume mounts
- Production logging
- Real SMTP service

### Logging

- **Format**: Structured JSON logs (recommended)
- **Levels**: DEBUG (dev), INFO (prod)
- **Destinations**: stdout/stderr → Docker logs

### Monitoring

- Health check endpoints on all services
- Docker health checks with retries
- Service dependency management

### Backup Strategy

- PostgreSQL: pg_dump via back-workers
- Cassandra: Snapshot + incremental backups
- Redis: RDB snapshots (configurable)
- SeaweedFS: Bucket replication

### Scalability Considerations

**Stateless Services** (can scale horizontally):
- back-api
- back-auth
- back-websockets
- front-admin
- front-public

**Stateful Services** (require careful scaling):
- postgresql (replication)
- cassandra (clustering)
- redis (sentinel/cluster)

**Load Balancing**:
- Nginx for HTTP/WebSocket
- Redis pub/sub for WebSocket fan-out

---

## Dependencies Summary

### Frontend Dependencies (Both Apps)

```json
{
  "@remix-run/node": "^2.5.0",
  "@remix-run/react": "^2.5.0",
  "@remix-run/serve": "^2.5.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "autoprefixer": "^10.4.18",
  "postcss": "^8.4.38",
  "tailwindcss": "^3.4.13",
  "typescript": "^5.3.0"
}
```

**front-public additions**:
```json
{
  "accept-language-parser": "^1.5.0",
  "i18next": "^23.7.6",
  "i18next-browser-languagedetector": "^7.2.0",
  "i18next-fs-backend": "^2.3.1",
  "i18next-http-backend": "^2.4.2",
  "isbot": "^4",
  "react-i18next": "^13.5.0",
  "remix-i18next": "^6.4.1",
  "zod": "^3.22.4"
}
```

### Backend Dependencies

**back-api**:
```txt
fastapi==0.110.0
uvicorn==0.29.0
pydantic[email]>=2.0.0
httpx>=0.24.0
asyncpg>=0.29.0
cassandra-driver>=3.28.0
boto3>=1.40.0
Pillow>=12.0.0
python-multipart>=0.0.6
bcrypt>=4.0.0
sqlalchemy[asyncio]>=2.0.0
```

**back-auth**:
```txt
fastapi==0.110.0
authlib==1.3.0
pyjwt==2.8.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
cassandra-driver==3.29.1
aiosmtplib==1.1.6
pydantic-settings==2.1.0
email-validator==2.2.0
httpx==0.27.0
psycopg2-binary==2.9.9
uvicorn==0.29.0
bcrypt==4.0.1
```

**back-websockets**:
```txt
fastapi==0.110.0
uvicorn==0.29.0
```

**back-workers**:
```txt
celery==5.3.6
redis==5.0.1
```

**feature-registry**:
```txt
fastapi==0.110.0
uvicorn==0.29.0
```

---

## Technology Decisions & Rationale

### Why Remix?
- Server-side rendering for better SEO and performance
- Built-in data loading patterns (loaders/actions)
- Progressive enhancement
- File-based routing
- Type-safe with TypeScript
- Excellent DX with hot reload

### Why FastAPI?
- Modern async/await support
- Automatic API documentation
- Pydantic validation
- High performance (on par with Node.js)
- Type hints for better IDE support
- Easy testing with pytest

### Why PostgreSQL?
- ACID compliance for financial data
- Mature, battle-tested
- Excellent async support (asyncpg)
- Rich query capabilities
- Strong consistency guarantees

### Why Cassandra?
- Write-heavy workloads (user events, logs)
- Time-series data modeling
- TTL support out of the box
- Horizontal scalability
- Eventual consistency acceptable for metadata

### Why Redis?
- Blazing fast in-memory operations
- Pub/sub for real-time features
- Native support for cache patterns
- Atomic operations for rate limiting
- Persistence options (RDB, AOF)

### Why Microservices?
- Independent scaling of services
- Technology flexibility
- Clear separation of concerns
- Easier testing and deployment
- Team autonomy (feature teams)

---

## Version Compatibility Matrix

| Service | Python | Node | Database | Required |
|---------|--------|------|----------|----------|
| back-api | 3.11 | - | PostgreSQL 15, Cassandra 4, Redis 7 | Yes |
| back-auth | 3.11 | - | PostgreSQL 15, Cassandra 4, Redis 7 | Yes |
| back-websockets | 3.11 | - | Redis 7 | Yes |
| back-workers | 3.11 | - | Redis 7 | Yes |
| feature-registry | 3.11 | - | PostgreSQL 15 | Yes |
| front-admin | - | 18+ | - | Yes |
| front-public | - | 18+ | - | Yes |

---

## Performance Considerations

### Database Pooling
- PostgreSQL: SQLAlchemy pool (min=5, max=20)
- Cassandra: Driver default (2 per host)
- Redis: Connection pooling via redis-py

### Caching Strategy
- L1 (Application): In-memory LRU cache
- L2 (Redis): Distributed cache (5 min TTL)
- L3 (Database): Query results

### API Response Times (Target)
- GET requests: < 100ms (cached), < 500ms (uncached)
- POST requests: < 1s
- File uploads: < 5s (10MB limit)

### WebSocket Performance
- Max connections per server: 10,000
- Max message size: 128KB
- Rate limit: 10 messages/second/user

---

## Browser Support

### Target Browsers
- Chrome: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Edge: Latest 2 versions

### Polyfills
- Handled by Vite/Remix build process
- ES modules support required

---

## Accessibility Standards

- **WCAG 2.1 Level AA** compliance
- Keyboard navigation support
- Screen reader compatibility
- ARIA labels on interactive elements
- Color contrast ratio: 4.5:1 (text), 3:1 (UI components)
- Focus indicators visible

---

## Future Considerations

### Potential Upgrades
- Kubernetes for orchestration
- GraphQL API layer
- ElasticSearch for full-text search
- Prometheus + Grafana for monitoring
- Sentry for error tracking
- CI/CD pipeline (GitHub Actions, GitLab CI)

### Optimization Opportunities
- CDN for static assets
- Database read replicas
- Redis clustering
- Cassandra multi-datacenter
- Edge caching with Cloudflare

---

**End of Technical Stack Specification**
