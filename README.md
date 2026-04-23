# Tools Dashboard

A modern, feature-rich administrative dashboard platform with a microservices architecture built for scalability and maintainability.

## Overview

Tools Dashboard is a comprehensive web-based administration platform designed to manage complex operations with real-time capabilities. The system is built on a modern tech stack with a focus on clear separation of concerns, feature isolation, and developer experience.

## Tech Stack

### Frontend Services
- **Remix Framework** - Full-stack React framework for modern web applications
- **React 18** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **i18n** - Internationalization support

### Backend Services
- **FastAPI/Uvicorn** - High-performance async Python API framework
- **PostgreSQL** - Primary relational database
- **Cassandra** - Distributed database for event logs and audit trails
- **Redis** - In-memory cache and job queue management
- **Celery/BullMQ** - Background job processing
- **SeaweedFS** - Distributed file storage

### Infrastructure
- **Docker & Docker Compose** - Containerization and orchestration
- **Nginx** - Reverse proxy and load balancer
- **WebSockets** - Real-time communication support

## Project Structure

```
tools-dashboard/
├── front-admin/              # Admin dashboard interface
├── front-public/             # Public-facing application
├── back-api/                 # Main API service (FastAPI)
├── back-auth/                # Authentication & authorization service
├── back-websockets/          # Real-time WebSocket service
├── back-workers/             # Celery background job processor
├── back-postgres/            # PostgreSQL initialization & migrations
├── back-cassandra/           # Cassandra initialization & schemas
├── back-redis/               # Redis configuration
├── back-gateway/             # API gateway configuration
├── feature-registry/         # Feature registry service
├── infra/                    # Infrastructure configuration (Nginx, Docker)
├── shared/                   # Shared utilities and types
├── seaweedfs/                # File storage configuration
└── docker-compose.dev.yml    # Development environment configuration
```

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for backend services)

### Development Environment

1. **Start the development stack:**
   ```bash
   ./bin/start.sh dev up
   ```
   Interactive menu (pick options after choosing `dev` / `prd`):
   ```bash
   ./bin/start.sh dev
   ```

2. **Access the services:**
   - **Via nginx (recommended):** http://localhost:8082/app/ (public), http://localhost:8082/admin/ (admin)
   - **Custom host without `:8082` (e.g. `https://dev.aiepic.app/...`):** point DNS at this machine, set `PUBLIC_APP_BASE_URL` (and OAuth redirect) in `.env` to that origin, and either use **`https://dev.aiepic.app:8082`** or install the host nginx example **`infra/nginx/system-port80-to-docker-8082.example.conf`** so port **80** on the host proxies to **127.0.0.1:8082** (Docker nginx).
   - Admin (direct Remix): http://localhost:4100
   - Public (direct Remix): http://localhost:4101
   - API: http://localhost:8100
   - Auth Service: http://localhost:8101
   - WebSockets: http://localhost:8102
   - Feature Registry: http://localhost:8105
   - Email Testing (MailHog): http://localhost:18026

3. **View logs:**
   ```bash
   ./bin/start.sh dev logs
   ```

4. **Stop services:**
   ```bash
   ./bin/start.sh dev down
   ```

### Docker helper (`bin/start.sh`)

All stack operations go through **`./bin/start.sh`** (environment + optional command).

| Goal | Command |
|------|---------|
| First-time / daily start (no image rebuild) | `./bin/start.sh dev up` |
| Rebuild images and start | `./bin/start.sh dev up-build` |
| Stop | `./bin/start.sh dev down` |
| Follow logs | `./bin/start.sh dev logs` |
| Rebuild stack, keep data (`build.log`) | `./bin/start.sh dev rebuild` |
| Wipe volumes and rebuild (**destructive**) | `./bin/start.sh dev reset` |
| Rolling restart only | `./bin/start.sh dev restart` |
| Interactive menu | `./bin/start.sh dev` |

Use `prd` instead of `dev` for the production-style compose file (see `.env.prd.example`). The HTTP edge defaults to **port 8082** on the host (same as dev); nothing binds host port **80**.

## Key Features

- **Microservices Architecture** - Independent, scalable services
- **Feature Isolation** - Each feature is self-contained and testable
- **Real-time Updates** - WebSocket support for live communication
- **Event-Driven** - Cassandra-based audit trails and event logs
- **Background Processing** - Async job queue for heavy operations
- **Multi-language Support** - i18n framework for internationalization
- **Authentication & Authorization** - Dedicated auth service with JWT support
- **Distributed File Storage** - SeaweedFS integration for scalable storage

## Architecture Highlights

### Service Communication
- Frontend services communicate with backend APIs via HTTP/REST
- Real-time features use WebSocket connections
- Background tasks are coordinated through Redis job queues
- Inter-service communication happens within the Docker network

### Data Storage
- **PostgreSQL**: User data, configuration, and primary records
- **Cassandra**: Event logs, audit trails, and time-series data
- **Redis**: Caching, session management, and job queues
- **SeaweedFS**: Distributed file storage for media and documents

### Feature Organization
Each service follows a feature-based directory structure:
```
service/features/feature-name/
├── components/       # UI components (frontend services)
├── hooks/           # React hooks (frontend services)
├── services/        # Business logic
├── controllers/     # Request handlers (backend services)
├── repositories/    # Data access (backend services)
├── types/          # Feature-specific types
└── README.md       # Feature documentation
```

## API Documentation

API endpoints are organized by feature. Refer to individual service documentation for detailed endpoint specifications:

- Backend API: http://localhost:8100/docs (when running)
- Authentication Service: http://localhost:8101/docs (when running)

## Contributing

1. Features are developed in isolation within their respective service
2. Follow the feature-based directory structure
3. Maintain TypeScript/Python type safety
4. Include tests for all new features
5. Document feature changes in feature-specific README files

## Development Notes

- Environment configuration uses `.env` files (see `.env.dev.example`)
- Services use health checks for dependency management
- Memory limits are configured per service (Docker Compose)
- Hot reload is enabled during development for rapid iteration

## Support

For issues, questions, or contributions, refer to the project documentation or contact the development team.

---

**Version**: 1.0.0
**Last Updated**: November 2025
