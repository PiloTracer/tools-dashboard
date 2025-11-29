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
   ./start-dev.sh
   ```

2. **Access the services:**
   - Admin Dashboard: http://localhost:4100
   - Public App: http://localhost:4101
   - API: http://localhost:8100
   - Auth Service: http://localhost:8101
   - WebSockets: http://localhost:8102
   - Feature Registry: http://localhost:8105
   - Email Testing (MailHog): http://localhost:8025

3. **View logs:**
   ```bash
   ./start-logs.sh
   ```

4. **Stop services:**
   ```bash
   ./stop-dev.sh
   ```

### Development Scripts

- `./start-dev.sh` - Initialize and start all services
- `./restart-dev.sh` - Restart running services
- `./reset-dev.sh` - Complete reset of development environment
- `./stop-dev.sh` - Stop all services

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
