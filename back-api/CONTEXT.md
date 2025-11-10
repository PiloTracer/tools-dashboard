## Core API Service (FastAPI)

**Technology**: FastAPI (Python 3.11) with async support, Uvicorn server  
**Purpose**: Orchestrates business logic, provides public API endpoints, and enforces security policies  
**Key Components**:
- Main API gateway (main.py)
- Feature-encapsulated modules (1 directory per feature)
- Dependency injection for data services

**AI Context Guidelines**:
1. NEVER implement database logic here - use back-postgres/back-cassandra
2. Each feature must have:
   - feature.yaml (contract definition)
   - api.py (FastAPI routers)
   - domain.py (business logic)
   - infrastructure.py (service integration)
3. All endpoints must use authentication from back-auth

**Critical Constraints**:
- Max context window: 1500 tokens per feature
- All input validation must use Pydantic
- Never hardcode rate limits (use configuration from shared)
