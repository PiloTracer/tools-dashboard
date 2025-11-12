# Tools Dashboard - Central Context

**Version**: 1.0.0
**Last Updated**: 2025-11-12

## Quick Start for AI Conversations

### Basic Template

When starting a new conversation, use this structure:

```
Working on feature: <feature-name>
Location: <path-to-feature>
Read: CONTEXT.md + <feature-path>/feature.yaml + <service>/CONTEXT.md
```

### Real Example 1: Simple Feature Modification (Single Service)

**Scenario:** Add a "pause subscription" option to user-subscription feature (backend only)

```
Working on feature: user-subscription
Location: back-api/features/user_subscription/

Context files to read:
1. /CONTEXT.md (architecture overview)
2. /back-api/CONTEXT.md (service constraints)
3. /back-api/features/user_subscription/feature.yaml (current contract)
4. /back-api/features/user_subscription/domain.py (business logic)

Goal: Add subscription pause functionality with grace period

Changes needed:
- Add new endpoint: POST /user-subscription/pause
- Update domain.py: add pause_subscription() method with 30-day grace period logic
- Define pause status in shared contract

Dependencies to document (no implementation):
- back-postgres: needs pause_date and resume_date columns in subscriptions table
- front-public: needs UI button and confirmation modal (separate conversation)

Acceptance criteria:
- Paused subscriptions retain access for 30 days
- Users can unpause before grace period expires
- Grace period calculates from pause_date
- Returns clear error if already paused

Please read the 4 context files above and propose the implementation for domain.py only.
```

**Estimated tokens:** ~3000 tokens

---

### Real Example 2: Complex Multi-Service Feature (Full Stack)

**Scenario:** Add real-time subscription status updates across the entire system

This change requires coordination across **6 services**. Here's how to structure it:

#### Phase 1: Shared Contract Definition (Start Here)

```
Working on feature: user-subscription (contract update)
Location: shared/contracts/user-subscription/

Context files to read:
1. /CONTEXT.md (sections: Architecture, Feature-Focused Development)
2. /shared/CONTEXT.md (contract guidelines)
3. /shared/contracts/user-subscription/feature.yaml (current contract)

Goal: Add real-time subscription status change events to the contract

Changes needed:
- Define WebSocket event schema for subscription changes
- Add event types: subscription.upgraded, subscription.paused, subscription.cancelled
- Define payload structure with user_id, subscription_id, new_status, timestamp
- Version bump to 1.1.0 (backward compatible)

New contract section to add:
```yaml
websocket_events:
  - event: subscription.status_changed
    payload:
      user_id: string
      subscription_id: string
      old_status: enum[active, paused, cancelled]
      new_status: enum[active, paused, cancelled]
      changed_at: ISO8601 timestamp
      metadata: object (optional)
```

Deliverable: Updated feature.yaml only. No implementation yet.
```

**Estimated tokens:** ~2000 tokens

---

#### Phase 2: Backend API Changes (After contract is updated)

```
Working on feature: user-subscription (backend implementation)
Location: back-api/features/user_subscription/

Context files to read:
1. /CONTEXT.md (service topology diagram)
2. /back-api/CONTEXT.md (service constraints)
3. /shared/contracts/user-subscription/feature.yaml (UPDATED in Phase 1)
4. /back-api/features/user_subscription/feature.yaml (current implementation)
5. /back-api/features/user_subscription/domain.py (business logic)
6. /back-api/features/user_subscription/infrastructure.py (service integration)

Goal: Emit real-time events when subscription status changes

Changes needed:
- infrastructure.py: Add RedisPublisher integration
- domain.py: Emit events in subscribe(), cancel(), pause() methods
- Follow pub/sub pattern: redis channel "subscription:events:{user_id}"

Services this will integrate with:
- back-redis: Pub/Sub for event broadcasting (document required channel pattern)
- back-postgres: No changes (already stores subscription status)
- back-cassandra: Document need for event metadata storage (optional)
- back-websockets: Will consume these events (Phase 3)

Redis channel pattern to use:
```python
channel = f"subscription:events:{user_id}"
message = {
    "event": "subscription.status_changed",
    "payload": { ... }  # from shared contract
}
```

Acceptance criteria:
- Every status change publishes to Redis
- Message format matches shared contract exactly
- Failed publishes are logged but don't block transaction
- Include correlation_id for debugging

Please read all 6 context files and implement infrastructure.py + domain.py changes.
```

**Estimated tokens:** ~5000 tokens

---

#### Phase 3: Data Layer Changes (Parallel with Phase 2)

**Phase 3A: PostgreSQL (Subscription Storage)**

```
Working on feature: user-subscription (PostgreSQL support)
Location: back-postgres/repositories/

Context files to read:
1. /CONTEXT.md (data separation guidelines)
2. /back-postgres/CONTEXT.md (schema constraints)
3. /shared/contracts/user-subscription/feature.yaml (UPDATED contract)
4. /back-postgres/repositories/financial_repository.py (existing pattern reference)

Goal: Ensure subscription status transitions are properly stored

Changes needed (if any):
- Review subscriptions table schema
- Confirm status transitions are atomic
- Add indexes if querying by status frequently

Note: This may be a no-op if schema already supports the feature.
Focus on query optimization for status filtering.

Deliverable: Schema recommendations or query optimizations only.
```

**Estimated tokens:** ~2500 tokens

---

**Phase 3B: Cassandra (Subscription Metadata)**

```
Working on feature: user-subscription (Cassandra metadata)
Location: back-cassandra/repositories/

Context files to read:
1. /CONTEXT.md (data separation guidelines)
2. /back-cassandra/CONTEXT.md (CQL constraints, TTL requirements)
3. /shared/contracts/user-subscription/feature.yaml (UPDATED contract)
4. /back-cassandra/repositories/subscription_metadata_repository.py (existing pattern)

Goal: Store subscription change event metadata for analytics

Changes needed:
- Add subscription_events table (time-series)
- Partition by user_id, cluster by timestamp descending
- TTL: 90 days (analytics retention)
- Store: event_type, old_status, new_status, metadata JSON

CQL schema to create:
```sql
CREATE TABLE subscription_events (
    user_id text,
    event_id timeuuid,
    event_type text,
    old_status text,
    new_status text,
    metadata text,  -- JSON
    PRIMARY KEY (user_id, event_id)
) WITH CLUSTERING ORDER BY (event_id DESC)
AND default_time_to_live = 7776000;  -- 90 days
```

Acceptance criteria:
- Writes are idempotent
- Consistency level: LOCAL_QUORUM
- Prepared statements for all queries
- Repository method: record_subscription_event(user_id, event_data)

Deliverable: Updated subscription_metadata_repository.py
```

**Estimated tokens:** ~3500 tokens

---

**Phase 3C: Redis (Caching & Pub/Sub)**

```
Working on feature: user-subscription (Redis integration)
Location: back-redis/

Context files to read:
1. /CONTEXT.md (service topology)
2. /back-redis/CONTEXT.md (key patterns, TTL requirements)
3. /shared/contracts/user-subscription/feature.yaml (UPDATED contract)
4. /back-redis/pubsub.py (existing pub/sub pattern)

Goal: Configure pub/sub channels and cache invalidation for subscription changes

Changes needed:
- pubsub.py: Define subscription event channels
- cache.py: Add invalidation logic when subscription changes
- Channel pattern: "subscription:events:{user_id}"
- Cache key pattern: "subscription:user:{user_id}:v1"

Implementation notes:
- Publishers: back-api (Phase 2)
- Subscribers: back-websockets (Phase 4)
- Cache TTL: 5 minutes
- Invalidate cache on any subscription status change event

Acceptance criteria:
- Channel follows naming convention
- Cache invalidation atomic with pub/sub
- Supports fan-out to multiple WebSocket connections
- Rate limiting: max 10 events/second/user

Deliverable: Updated pubsub.py + cache.py with channel definitions and invalidation hooks
```

**Estimated tokens:** ~3000 tokens

---

#### Phase 4: WebSocket Real-Time Updates (After Phase 2 & 3C)

```
Working on feature: user-subscription (real-time notifications)
Location: back-websockets/

Context files to read:
1. /CONTEXT.md (service topology)
2. /back-websockets/CONTEXT.md (message size, rate limits, security)
3. /shared/contracts/user-subscription/feature.yaml (UPDATED contract with events)
4. /back-websockets/connection_manager.py (connection handling)
5. /back-redis/pubsub.py (UPDATED in Phase 3C - channel definitions)

Goal: Subscribe to Redis events and push to connected WebSocket clients

Changes needed:
- Subscribe to channel: "subscription:events:{user_id}"
- Forward events to authenticated WebSocket connections for that user
- Handle connection failures gracefully
- Respect rate limits: 10 messages/second/user

Integration points:
- back-redis: Subscriber to pub/sub channel (Phase 3C)
- back-auth: Validate WebSocket authentication tokens
- Message format: exactly as defined in shared contract

Flow:
1. Client connects via WebSocket with JWT token
2. Server subscribes to user's subscription event channel
3. When back-api publishes event → Redis → WebSocket → Client
4. Client receives real-time notification of subscription change

Acceptance criteria:
- Only authenticated users receive their own subscription events
- Messages match shared contract schema exactly
- Handles reconnections without losing events (best effort)
- Respects max message size: 128KB
- Logs all forwarded events for debugging

Deliverable: Updated connection_manager.py with Redis subscription integration
```

**Estimated tokens:** ~4500 tokens

---

#### Phase 5: Frontend UI Updates (After Phase 4)

```
Working on feature: user-subscription (real-time UI)
Location: front-public/app/features/user-subscription/

Context files to read:
1. /CONTEXT.md (frontend standards)
2. /front-public/CONTEXT.md (Remix patterns, accessibility)
3. /shared/contracts/user-subscription/feature.yaml (UPDATED contract with events)
4. /front-public/app/features/user-subscription/feature.yaml (current UI routes)
5. /front-public/app/features/user-subscription/ui/SubscriptionCard.tsx (main component)

Goal: Display real-time subscription status updates via WebSocket

Changes needed:
- Add WebSocket connection hook in routes/index.tsx
- Update SubscriptionCard.tsx to show status changes in real-time
- Show toast notification when subscription status changes
- Handle WebSocket disconnections gracefully

WebSocket integration:
- Connect to: ws://localhost:8082/ws (back-websockets)
- Send JWT token on connect
- Listen for "subscription.status_changed" events
- Update UI optimistically + reconcile with server on reconnect

UI/UX requirements:
- Toast notification: "Your subscription has been paused"
- Status badge updates immediately (green→yellow→red)
- Accessible: WCAG 2.1 compliant, keyboard navigation
- Responsive: mobile-first, works on all screen sizes
- Loading state while WebSocket connecting

Acceptance criteria:
- Real-time updates without page refresh
- Graceful fallback if WebSocket unavailable (poll every 30s)
- Type-safe event handling (TypeScript)
- Unit tests for WebSocket hook
- Playwright test for real-time update flow

Deliverable: Updated routes/index.tsx + ui/SubscriptionCard.tsx + WebSocket hook
```

**Estimated tokens:** ~5000 tokens

---

### Summary: Multi-Service Feature Development

**Total phases:** 5 (1 contract + 4 implementations)
**Services touched:** 6 (shared, back-api, back-postgres, back-cassandra, back-redis, back-websockets, front-public)
**Total estimated tokens:** ~25,500 tokens (split across 8 conversations)
**Time savings:** Each conversation is focused, parallel-friendly, and maintains minimal context

**Execution order:**
```
Phase 1 (contract) → MUST complete first
  ↓
Phase 2 (back-api) + Phase 3A,B,C (data layers) → Can run in parallel
  ↓
Phase 4 (websockets) → Requires Phase 2 + 3C complete
  ↓
Phase 5 (frontend) → Requires Phase 4 complete
```

**Key principles demonstrated:**
1. ✅ **Contract-first**: Shared contract defines the interface
2. ✅ **Parallel-friendly**: Data layer changes run independently
3. ✅ **Minimal context**: Each phase loads only 4-6 files
4. ✅ **Clear dependencies**: Explicitly documented, not implemented
5. ✅ **Phased testing**: Each phase has acceptance criteria
6. ✅ **Integration notes**: Cross-service requirements documented inline

---

## System Architecture Overview

### Services Topology

```
┌─────────────────┐     ┌──────────────────┐
│  front-public   │────▶│   back-gateway   │
│  front-admin    │     │     (Kong)       │
└─────────────────┘     └─────────┬────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   ▼              ▼              ▼
            ┌──────────┐   ┌──────────┐  ┌──────────┐
            │ back-api │   │back-auth │  │  others  │
            └────┬─────┘   └────┬─────┘  └──────────┘
                 │              │
        ┌────────┼──────────────┼────────┐
        ▼        ▼              ▼        ▼
  ┌──────────┐ ┌────────┐ ┌─────────┐ ┌────────┐
  │postgres  │ │cassandra│ │  redis  │ │workers │
  └──────────┘ └────────┘ └─────────┘ └────────┘
```

### Service Directory

| Service | Technology | Purpose | Port |
|---------|-----------|---------|------|
| **back-gateway** | Kong | API gateway, rate limiting, routing | 8082 (HTTP), 8443 (HTTPS) |
| **back-api** | FastAPI | Business logic orchestration | 4100 |
| **back-auth** | FastAPI + Authlib | Authentication (OAuth2, email, 2FA) | 4101 |
| **back-postgres** | PostgreSQL | User accounts, financial data | 55432 |
| **back-cassandra** | Cassandra | Extended profiles, config | 9142 |
| **back-redis** | Redis | Cache, pub/sub, rate limiting | 6380 |
| **back-websockets** | FastAPI + WebSockets | Real-time communication | 4102 |
| **back-workers** | Celery | Background tasks (backup, cleanup, export) | - |
| **feature-registry** | FastAPI | Feature catalog and versioning | - |
| **front-public** | Remix | User-facing dashboard | 8082/app/ |
| **front-admin** | Remix | Admin dashboard | 8082/admin/ |
| **shared** | Python/TypeScript | Cross-service contracts, models, security | - |

---

## Feature-Focused Development

### Core Principle

**Each feature is a self-contained, versioned module with clear boundaries and contracts.**

### Feature Structure

#### Backend Features (FastAPI)
```
back-api/features/<feature-name>/
├── feature.yaml          # Contract definition
├── api.py               # FastAPI routers
├── domain.py            # Business logic (no database calls)
└── infrastructure.py    # Service integration layer
```

#### Frontend Features (Remix)
```
front-public/app/features/<feature-name>/
├── feature.yaml         # Contract definition
├── routes/             # Remix routes (loaders/actions)
│   └── index.tsx
└── ui/                 # React components
    └── ComponentName.tsx
```

#### Shared Contracts
```
shared/contracts/<feature-name>/
├── feature.yaml         # Master contract
├── schemas/            # JSON schemas
└── models/             # Shared models
```

### Feature.yaml Structure

**Backend Example:**
```yaml
name: feature-name
version: 1.0.0
endpoints:
  - method: POST
    path: /feature-endpoint
    auth: required
    description: What this endpoint does
dependencies:
  - service@version
schemas:
  request: request_schema.json
  response: response_schema.json
```

**Frontend Example:**
```yaml
name: feature-name
version: 1.0.0
routes:
  - path: /features/feature-name
    file: routes/index.tsx
ui:
  - ui/ComponentName.tsx
```

---

## Working with Features - Best Practices

### 1. Starting a Feature Conversation

**Option A: Feature-Focused Conversation (Recommended)**

Start a dedicated conversation for a single feature:

```
I need to work on the "user-registration" feature.

Context needed:
- CONTEXT.md (this file)
- back-api/CONTEXT.md
- back-api/features/user-registration/feature.yaml
- back-api/features/user-registration/*.py

Goal: [describe what you need to change]
```

**Option B: Cross-Feature Change**

When changes span multiple features:

```
I need to modify the following features:
1. Feature A: back-api/features/feature-a/
2. Feature B: front-public/app/features/feature-b/

Context needed:
- CONTEXT.md
- Both feature.yaml files
- Shared contract in shared/contracts/

Goal: [describe the integration change]
```

### 2. Minimal Context Loading

**Always load context in this order:**

1. **CONTEXT.md** (this file) - Architecture overview
2. **Service CONTEXT.md** - Service-specific constraints
3. **feature.yaml** - Feature contract
4. **Implementation files** - Only the files you need to change

**Anti-pattern:** Don't read entire service directories. Target specific files.

### 3. Feature Isolation Rules

**DO:**
- ✅ Modify only files within the feature directory
- ✅ Define required API contracts for other services
- ✅ Update feature.yaml when adding endpoints/routes
- ✅ Increment version when breaking changes occur
- ✅ Document dependencies explicitly

**DON'T:**
- ❌ Touch files outside feature directory without explicit instruction
- ❌ Implement database logic in back-api (use back-postgres/back-cassandra)
- ❌ Duplicate business logic between frontend and backend
- ❌ Add business logic to shared/ (only models and contracts)
- ❌ Break existing API contracts without version bump

### 4. Cross-Feature Communication

**Features communicate through:**

1. **feature.yaml contracts** - Define API surface
2. **shared/contracts/** - Cross-service data models
3. **Dependencies declaration** - Track feature dependencies
4. **Feature Registry** - Central catalog of all features

**Example Workflow:**

If Feature A needs data from Feature B:

```
Feature A (back-api/features/a/):
- Defines requirement in feature.yaml dependencies
- Calls Feature B endpoint through infrastructure.py

Feature B (back-api/features/b/):
- Exposes endpoint in api.py
- Documents contract in feature.yaml
```

---

## Conversation Strategies

### Single-Feature Development (Most Common)

**Setup:**
1. Open conversation with feature name and location
2. Load minimal context (3-4 files max)
3. Make changes within feature boundary
4. Document API requirements for dependent services

**Example Prompt:**
```
Feature: user-subscription
Location: back-api/features/user_subscription/

Changes needed:
- Add new endpoint for subscription cancellation
- Update domain logic to handle grace periods

Please read:
1. CONTEXT.md
2. back-api/CONTEXT.md
3. back-api/features/user_subscription/feature.yaml
4. back-api/features/user_subscription/domain.py
```

### Multi-Feature Coordination

**Setup:**
1. Identify all affected features
2. Start with shared contract changes
3. Create separate "implementation notes" for each feature
4. Update each feature sequentially

**Example Prompt:**
```
Cross-feature change: Add subscription tier to user profile

Affected:
- shared/contracts/user-subscription/
- back-api/features/user-subscription/
- front-public/app/features/user-subscription/

Approach:
1. Update shared contract first
2. Document API changes needed in back-api
3. Document UI changes needed in front-public
```

### Feature-to-Feature Communication

**Current Architecture:** Conversations cannot directly communicate, but you can:

1. **Use Integration Notes:**
   Create `INTEGRATION_NOTES.md` in each feature documenting dependencies:
   ```markdown
   # Feature Dependencies

   ## Consumes
   - back-auth/features/email-auth: POST /auth/verify
   - back-api/features/user-profile: GET /profile/:id

   ## Provides
   - GET /user-registration/status
   - POST /user-registration/submit
   ```

2. **Leverage feature.yaml:**
   Explicitly list dependencies with versions:
   ```yaml
   dependencies:
     - back-auth@1.2.0
     - user-profile@2.1.0
   ```

3. **Coordinate Through Shared Contracts:**
   When multiple features need alignment:
   - Update `shared/contracts/<feature>/feature.yaml` first
   - Reference this contract in all dependent features
   - Each feature conversation reads the same shared contract

4. **Sequential Development:**
   Work on features in dependency order:
   ```
   Conversation 1: Update shared/contracts/user-subscription/
   Conversation 2: Update back-api/features/user_subscription/ (references shared contract)
   Conversation 3: Update front-public/app/features/user-subscription/ (references shared contract)
   ```

---

## Development Workflow

### Local Development
```bash
# Start stack
docker compose -f docker-compose.dev.yml up --build

# Access points
# Public: http://localhost:8082/app/
# Admin: http://localhost:8082/admin/
```

### Making Changes

**Step 1: Gather Context**
```bash
# Optional: Use context generator (if available)
bash ./.ai/generate-context.sh <feature-name> <backend|frontend>
```

**Step 2: AI Conversation**
```
Feature: <name>
Location: <path>
Context: <list 3-4 files>
Change: <describe modification>
```

**Step 3: Implementation**
- AI modifies files within feature boundary
- AI documents any cross-service requirements
- AI updates feature.yaml if needed

**Step 4: Testing**
```bash
# Rebuild affected service
docker compose -f docker-compose.dev.yml up --build <service-name>

# Check logs
docker compose -f docker-compose.dev.yml logs -f <service-name>
```

---

## Key Architectural Constraints

### Security
- All tokens expire: 15min (access), 7 days (refresh)
- Refresh tokens are single-use with rotation
- Passwords use bcrypt + HaveIBeenPwned check
- All sensitive operations require re-authentication
- Authentication handled exclusively by back-auth

### Data Separation
- **PostgreSQL**: User accounts, financial data, structured relational data
- **Cassandra**: Extended profiles, configuration, high-volume time-series
- **Redis**: Cache, pub/sub, rate limiting, sessions

### Service Responsibilities
- **back-api**: Orchestration only (no database logic, no auth logic)
- **back-auth**: All authentication methods (Google OAuth, email, 2FA)
- **back-postgres/back-cassandra**: Repository pattern, all database operations
- **front-public/front-admin**: UI only, all data via loaders from back-api

### Frontend Standards
- All components: Accessible (WCAG 2.1), responsive, type-safe, documented
- No business logic duplication from backend
- All data through Remix loaders/actions
- Client-side validation + server-side validation
- Tailwind CSS for styling

---

## Feature Registry System

The **feature-registry** service maintains a catalog of all features across the ecosystem:

- Tracks feature versions and dependencies
- Validates feature contracts against schemas
- Manages application registration and approval
- Provides dependency resolution
- Maintains audit trail

**Usage:** When creating a new feature, it must be registered in the feature-registry with:
- Name, version, required permissions
- API contracts and schemas
- Dependencies on other features

---

## Troubleshooting Context Overload

If your conversation context is getting too large:

### Symptoms
- Slow responses
- "Context window exceeded" errors
- AI making assumptions about code it hasn't seen

### Solutions

1. **Narrow Scope:**
   ```
   Instead of: "Update authentication"
   Use: "Add password reset to back-auth/features/email-auth/domain.py"
   ```

2. **Split Conversations:**
   ```
   Conversation 1: Backend API changes
   Conversation 2: Frontend UI changes
   Link via: shared contract reference
   ```

3. **Feature-First Approach:**
   ```
   Start: Read feature.yaml only
   Then: Read specific implementation files
   Avoid: Reading entire service directories
   ```

4. **Use File Paths:**
   Reference exact files instead of exploring:
   ```
   Read: back-api/features/user-registration/domain.py:45-67
   Instead of: "Search for user registration logic"
   ```

---

## Quick Reference

### Essential Files for Any Conversation
1. `CONTEXT.md` (this file)
2. `<service>/CONTEXT.md` (service constraints)
3. `<feature>/feature.yaml` (feature contract)

### Feature Locations
- Backend: `back-api/features/` or `back-auth/features/`
- Frontend: `front-public/app/features/` or `front-admin/app/features/`
- Contracts: `shared/contracts/`

### Current Features
**Backend (back-api):**
- user-registration
- progressive-profiling
- user-subscription
- user-status

**Backend (back-auth):**
- google-auth
- email-auth
- two-factor

**Frontend (front-public):**
- user-registration
- progressive-profiling
- user-logout
- change-language
- user-subscription
- user-status

**Frontend (front-admin):**
- user-management
- task-scheduler

### Common Commands
```bash
# Start dev stack
docker compose -f docker-compose.dev.yml up --build

# Rebuild single service
docker compose -f docker-compose.dev.yml up --build <service>

# View logs
docker compose -f docker-compose.dev.yml logs -f <service>

# Clean everything
docker compose -f docker-compose.dev.yml down --volumes --remove-orphans
```

---

## Optimization Tips for AI Development

### Maximum Efficiency Checklist

- [ ] Load only CONTEXT.md + service CONTEXT.md + feature.yaml initially
- [ ] Target specific files by path (avoid directory scanning)
- [ ] Limit scope to single feature when possible
- [ ] Document cross-service requirements instead of implementing directly
- [ ] Use feature.yaml dependencies to track relationships
- [ ] Version bump on breaking changes
- [ ] Update CONTEXT.md when adding new architectural patterns

### Context Budget Guidelines

**Minimal** (Best for single-file changes):
- CONTEXT.md
- service/CONTEXT.md
- feature/feature.yaml
- 1-2 implementation files
- ~2000 tokens

**Standard** (Most feature work):
- Above + all files in feature directory
- Relevant shared contracts
- ~5000 tokens

**Comprehensive** (Cross-feature changes):
- Above + dependent feature.yaml files
- Integration points in other services
- ~10000 tokens

**When to split conversations:**
If you need >10000 tokens, split into:
1. Backend conversation (API changes)
2. Frontend conversation (UI changes)
3. Infrastructure conversation (database, config)

---

## Next Steps

When starting a new conversation, copy this template:

```
Feature: <feature-name>
Service: <service-name>
Location: <full-path-to-feature>

Context files to read:
1. CONTEXT.md
2. <service>/CONTEXT.md
3. <feature-path>/feature.yaml

Goal: [One sentence describing the change]

Approach: [Brief outline of what needs to change]
```

This ensures:
- ✅ Minimal context loading
- ✅ Clear scope boundaries
- ✅ Focused, efficient development
- ✅ Easy to resume in new conversations
