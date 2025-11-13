# Cross-Service Feature Development Guide

## Overview

Many features in the Tools Dashboard span multiple services. This guide helps you identify which services a feature should touch, coordinate changes across services, manage shared resources, and ensure consistency.

## Table of Contents

1. [Feature Scope Identification](#feature-scope-identification)
2. [Service Boundaries](#service-boundaries)
3. [Cross-Service Patterns](#cross-service-patterns)
4. [Shared Resources](#shared-resources)
5. [Implementation Workflow](#implementation-workflow)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Coordination](#deployment-coordination)
8. [Common Scenarios](#common-scenarios)
9. [Troubleshooting](#troubleshooting)

---

## Feature Scope Identification

### Questions to Determine Scope

Ask these questions to identify which services your feature should touch:

#### 1. Does the feature need a user interface?
- **Yes → front-public** (user-facing)
- **Yes → front-admin** (admin interface)
- **No → Backend only**

#### 2. Does the feature involve business logic?
- **Yes → back-api** (orchestration and business rules)

#### 3. Does the feature involve authentication or authorization?
- **Authentication → back-auth** (login, tokens, sessions)
- **Authorization → back-api** (permission checks, RBAC)

#### 4. Does the feature need to store data?
- **Relational data → back-postgres** (users, transactions, structured)
- **NoSQL data → back-cassandra** (events, time-series, configs)
- **Cache/Session → back-redis** (temporary data, rate limiting)

#### 5. Does the feature need background processing?
- **Yes → back-workers** (scheduled tasks, async operations)

#### 6. Does the feature need real-time updates?
- **Yes → back-websockets** (live notifications, updates)

#### 7. Does the feature need rate limiting or routing rules?
- **Yes → back-gateway** (Kong configuration)

#### 8. Does the feature define shared types or contracts?
- **Yes → shared/** (models, contracts, utilities)

### Feature Scope Matrix

| Feature Type | Services Involved | Example |
|--------------|-------------------|---------|
| **User-facing CRUD** | front-public, back-api, back-postgres | User profile management |
| **Admin Management** | front-admin, back-api, back-postgres | User administration |
| **Authentication** | front-public, back-auth, back-postgres, back-cassandra | Email/password login |
| **Background Jobs** | back-api, back-workers, back-postgres | Scheduled reports |
| **Real-time Feature** | front-public, back-api, back-websockets, back-redis | Live notifications |
| **Data Export** | front-admin, back-workers, back-postgres | CSV exports |
| **API Integration** | back-api, back-workers | Third-party sync |

---

## Service Boundaries

### Critical Rules

#### Frontend Services (front-public, front-admin)
**CAN:**
- Render UI components
- Handle user input
- Client-side validation
- Call backend via loaders/actions
- Manage UI state (Zustand)

**CANNOT:**
- Implement business logic
- Direct database access
- Direct authentication logic
- Process payments
- Generate tokens

**Example:**
```typescript
// ✅ CORRECT: Frontend calls backend
export async function loader() {
  const response = await fetch('/api/users/profile');
  return response.json();
}

// ❌ WRONG: Business logic in frontend
export async function loader() {
  const user = await db.users.find(...); // NO!
  const discountPrice = calculateDiscount(user); // Business logic!
  return { user, discountPrice };
}
```

#### Business API (back-api)
**CAN:**
- Orchestrate business logic
- Validate business rules
- Call authentication service
- Call repository services
- Transform data
- Implement domain logic

**CANNOT:**
- Direct database access
- Implement authentication
- Generate JWT tokens
- Hash passwords
- Store sessions

**Example:**
```python
# ✅ CORRECT: Orchestration
async def create_subscription(user_id: str, plan: str):
    # Verify user exists (via repository)
    user = await postgres_service.get_user(user_id)

    # Business logic
    if not user.can_subscribe():
        raise BusinessError("User cannot subscribe")

    # Create subscription (via repository)
    subscription = await postgres_service.create_subscription(
        user_id, plan
    )

    # Trigger async task (via workers)
    await workers_service.send_welcome_email(user_id)

    return subscription

# ❌ WRONG: Direct database access
async def create_subscription(user_id: str, plan: str):
    user = await db.execute("SELECT * FROM users...") # NO!
```

#### Authentication Service (back-auth)
**CAN:**
- Authenticate users
- Generate JWT tokens
- Validate tokens
- Manage sessions
- Handle OAuth flows
- Implement 2FA

**CANNOT:**
- Implement business logic
- Direct database access
- Process payments
- Send emails (delegate to workers)

**Example:**
```python
# ✅ CORRECT: Authentication only
async def login(email: str, password: str):
    # Get user from repository
    user = await postgres_service.get_user_by_email(email)

    # Verify password
    if not verify_password(password, user.hashed_password):
        raise AuthError("Invalid credentials")

    # Generate token
    token = generate_jwt(user.id, user.role)

    return {"access_token": token}

# ❌ WRONG: Business logic in auth service
async def login(email: str, password: str):
    user = await postgres_service.get_user_by_email(email)

    # This is business logic, belongs in back-api!
    if user.subscription_expired():
        user.downgrade_to_free_tier()
```

#### Repository Services (back-postgres, back-cassandra)
**CAN:**
- Execute database queries
- Implement repository pattern
- Handle connections
- Run migrations

**CANNOT:**
- Implement business logic
- Validate business rules
- Call other services
- Generate tokens

**Example:**
```python
# ✅ CORRECT: Pure data access
async def get_user(user_id: str) -> User:
    query = "SELECT * FROM users WHERE id = $1"
    result = await db.fetch_one(query, user_id)
    return User(**result)

# ❌ WRONG: Business logic in repository
async def get_user(user_id: str) -> User:
    user = await db.fetch_one(...)

    # Business logic doesn't belong here!
    if user.subscription_expired():
        user.status = "inactive"

    return user
```

---

## Cross-Service Patterns

### Pattern 1: Create Entity (CRUD)

**Services**: Frontend → back-api → back-postgres

**Flow**:
```
1. User submits form (Frontend)
   ↓
2. Remix action calls back-api (Frontend)
   ↓
3. Validate business rules (back-api)
   ↓
4. Call repository service (back-api → back-postgres)
   ↓
5. Return success (back-postgres → back-api → Frontend)
```

**Example: Create User Profile**
```typescript
// front-public/app/features/profile/routes/create.tsx
export async function action({ request }) {
  const formData = await request.formData();

  // Call back-api
  const response = await fetch('http://back-api:8100/api/profile', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(formData)),
    headers: { 'Content-Type': 'application/json' }
  });

  return response.json();
}
```

```python
# back-api/features/profile/api.py
@router.post("/api/profile")
async def create_profile(profile: ProfileCreate):
    # Validate business rules
    if not profile.is_complete():
        raise BusinessError("Profile incomplete")

    # Call repository
    user = await postgres_service.create_profile(profile)

    return user
```

```python
# back-postgres/repositories/profile_repository.py
async def create_profile(profile: ProfileCreate) -> Profile:
    query = "INSERT INTO profiles (...) VALUES (...)"
    result = await db.execute(query, *profile.values())
    return Profile(**result)
```

### Pattern 2: Authentication Flow

**Services**: Frontend → back-auth → back-postgres

**Flow**:
```
1. User submits login form (Frontend)
   ↓
2. Remix action calls back-auth (Frontend)
   ↓
3. Verify credentials (back-auth → back-postgres)
   ↓
4. Generate JWT token (back-auth)
   ↓
5. Return token (back-auth → Frontend)
   ↓
6. Store in secure cookie (Frontend)
```

### Pattern 3: Business Logic with Auth

**Services**: Frontend → back-api → back-auth + back-postgres

**Flow**:
```
1. User action with JWT (Frontend)
   ↓
2. Validate JWT (back-api → back-auth)
   ↓
3. Execute business logic (back-api)
   ↓
4. Update data (back-api → back-postgres)
   ↓
5. Return result (back-postgres → back-api → Frontend)
```

### Pattern 4: Background Processing

**Services**: Frontend → back-api → back-workers

**Flow**:
```
1. User triggers action (Frontend)
   ↓
2. Create task (back-api → back-workers)
   ↓
3. Return task ID (back-api → Frontend)
   ↓
4. Poll for status (Frontend → back-api)
   ↓
5. Task executes async (back-workers → back-postgres)
```

### Pattern 5: Real-time Updates

**Services**: Frontend → back-websockets → back-redis

**Flow**:
```
1. User connects WebSocket (Frontend → back-websockets)
   ↓
2. Subscribe to channel (back-websockets → back-redis)
   ↓
3. Event published (back-api → back-redis)
   ↓
4. Message broadcast (back-redis → back-websockets → Frontend)
```

---

## Shared Resources

### What Goes in shared/

The `shared/` directory contains resources used by multiple services:

#### 1. Data Models (shared/models/)
```python
# shared/models/user.py
from pydantic import BaseModel

class User(BaseModel):
    id: str
    email: str
    role: str
    permissions: list[str]
```

**Used by**: All services that handle users

#### 2. Feature Contracts (shared/contracts/)
```yaml
# shared/contracts/user-registration/feature.yaml
name: user-registration
version: 1.0.0
type: cross-service

services:
  - name: front-public
    provides: [UI]
  - name: back-api
    provides: [business-logic]
  - name: back-auth
    provides: [authentication]
  - name: back-postgres
    provides: [data-persistence]

dependencies:
  back-api:
    - back-auth: ">=1.2.0"
    - back-postgres: ">=1.0.0"
```

#### 3. Security Utilities (shared/security/)
```python
# shared/security/jwt.py
def generate_jwt(user_id: str, role: str) -> str:
    # Shared JWT generation logic
    pass

def verify_jwt(token: str) -> dict:
    # Shared JWT verification logic
    pass
```

**Used by**: back-auth, back-api

#### 4. Common Constants (shared/security/constants.py)
```python
# shared/security/constants.py
JWT_ALGORITHM = "RS256"
JWT_EXPIRATION = 15 * 60  # 15 minutes
REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60  # 7 days
```

### When to Create Shared Resources

**DO create shared resources when:**
- Multiple services need the same model
- Type safety across services is critical
- Constants must be consistent
- Utility functions used by multiple services

**DON'T create shared resources for:**
- Service-specific logic
- Implementation details
- Database schemas (use migrations)
- UI components (keep in frontend)

### Versioning Shared Resources

When changing shared resources:

1. **Backward compatible changes** (safe):
   - Adding optional fields
   - Adding new functions
   - Adding new constants

2. **Breaking changes** (requires coordination):
   - Removing fields
   - Renaming fields
   - Changing function signatures
   - Changing constant values

For breaking changes:
```yaml
# Increment version in all affected feature.yaml files
dependencies:
  shared: ">=2.0.0"  # Breaking change!
```

---

## Implementation Workflow

### Step-by-Step Process

#### 1. Plan Phase

**A. Identify Services**
- List all services the feature will touch
- Map data flow between services
- Identify shared resources needed

**B. Define Contracts**
```yaml
# Create shared/contracts/{feature-name}/feature.yaml
name: {feature-name}
version: 1.0.0
type: cross-service

services:
  - name: front-public
    version: 1.0.0
  - name: back-api
    version: 1.0.0
  - name: back-postgres
    version: 1.0.0

data_flow:
  - front-public → back-api → back-postgres

dependencies:
  back-api:
    - back-postgres: ">=1.0.0"
```

**C. Create Models**
```python
# shared/models/{feature-name}.py
from pydantic import BaseModel

class FeatureCreate(BaseModel):
    field1: str
    field2: int

class FeatureResponse(BaseModel):
    id: str
    field1: str
    field2: int
    created_at: datetime
```

#### 2. Implementation Phase

**Order**: Shared → Data → Backend → Frontend

**A. Implement Shared Resources**
```bash
# Create shared models
touch shared/models/{feature-name}.py

# Create shared contract
mkdir -p shared/contracts/{feature-name}/
touch shared/contracts/{feature-name}/feature.yaml
```

**B. Implement Data Layer**
```bash
# PostgreSQL repository
touch back-postgres/repositories/{feature-name}_repository.py

# Cassandra repository (if needed)
touch back-cassandra/repositories/{feature-name}_repository.py
```

```python
# back-postgres/repositories/{feature-name}_repository.py
async def create_{entity}(data: EntityCreate) -> Entity:
    query = "INSERT INTO {table} (...) VALUES (...)"
    result = await db.execute(query, ...)
    return Entity(**result)

async def get_{entity}(id: str) -> Entity:
    query = "SELECT * FROM {table} WHERE id = $1"
    result = await db.fetch_one(query, id)
    return Entity(**result)
```

**C. Implement Backend Logic**
```bash
# Create feature directory in back-api
mkdir -p back-api/features/{feature-name}/
touch back-api/features/{feature-name}/__init__.py
touch back-api/features/{feature-name}/api.py
touch back-api/features/{feature-name}/domain.py
touch back-api/features/{feature-name}/infrastructure.py
touch back-api/features/{feature-name}/feature.yaml
```

```python
# back-api/features/{feature-name}/api.py
from fastapi import APIRouter
from .domain import FeatureDomain

router = APIRouter()

@router.post("/api/{feature-name}")
async def create_entity(data: FeatureCreate):
    domain = FeatureDomain()
    return await domain.create(data)
```

```python
# back-api/features/{feature-name}/domain.py
class FeatureDomain:
    async def create(self, data: FeatureCreate):
        # Business logic
        if not self.validate(data):
            raise BusinessError("Invalid data")

        # Call repository
        entity = await postgres_service.create_{entity}(data)

        return entity
```

**D. Implement Frontend**
```bash
# Create feature directory in front-public
mkdir -p front-public/app/features/{feature-name}/routes/
mkdir -p front-public/app/features/{feature-name}/ui/
touch front-public/app/features/{feature-name}/routes/index.tsx
touch front-public/app/features/{feature-name}/ui/FeatureForm.tsx
touch front-public/app/features/{feature-name}/feature.yaml
```

```typescript
// front-public/app/features/{feature-name}/routes/index.tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const response = await fetch('http://back-api:8100/api/{feature-name}', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(formData)),
    headers: { 'Content-Type': 'application/json' }
  });

  return response.json();
}

export default function FeaturePage() {
  return <FeatureForm />;
}
```

#### 3. Testing Phase

**A. Unit Tests** (per service)
```python
# back-api/tests/{feature-name}/test_domain.py
def test_create_entity():
    domain = FeatureDomain()
    result = await domain.create(mock_data)
    assert result.id is not None
```

**B. Integration Tests** (service interactions)
```python
# back-api/tests/{feature-name}/test_integration.py
def test_create_entity_integration():
    # Test back-api → back-postgres flow
    response = await client.post("/api/{feature-name}", json=data)
    assert response.status_code == 200
```

**C. End-to-End Tests** (full flow)
```typescript
// tests/e2e/{feature-name}.test.ts
test('create entity flow', async () => {
  // Navigate to page
  await page.goto('/features/{feature-name}');

  // Fill form
  await page.fill('input[name="field1"]', 'value');

  // Submit
  await page.click('button[type="submit"]');

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible();
});
```

#### 4. Documentation Phase

```yaml
# Update feature.yaml in each service
name: {feature-name}
version: 1.0.0
service: {service-name}

dependencies:
  - service: {other-service}
    version: ">=1.0.0"

endpoints:
  - path: /api/{feature-name}
    method: POST
    auth_required: true
```

---

## Testing Strategy

### Test Pyramid for Cross-Service Features

```
        /\
       /  \     E2E Tests (few)
      /____\    Test complete user flows
     /      \
    /________\  Integration Tests (some)
   /          \ Test service interactions
  /____________\ Unit Tests (many)
                Test individual components
```

### Unit Tests
- Test each service independently
- Mock all external dependencies
- Fast execution
- High coverage

**Example**:
```python
# back-api/tests/features/profile/test_domain.py
@pytest.fixture
def mock_postgres():
    return MagicMock(spec=PostgresService)

async def test_create_profile(mock_postgres):
    domain = ProfileDomain(postgres_service=mock_postgres)

    mock_postgres.create_profile.return_value = Profile(id="123")

    result = await domain.create(ProfileCreate(...))

    assert result.id == "123"
    mock_postgres.create_profile.assert_called_once()
```

### Integration Tests
- Test interactions between 2-3 services
- Use test database
- Moderate execution time
- Critical paths

**Example**:
```python
# back-api/tests/integration/test_profile_creation.py
async def test_create_profile_integration(test_client, test_db):
    # This tests back-api → back-postgres flow
    response = await test_client.post(
        "/api/profile",
        json={"name": "Test User"}
    )

    assert response.status_code == 200

    # Verify in database
    user = await test_db.fetch_one("SELECT * FROM profiles WHERE id = $1", response.json()["id"])
    assert user.name == "Test User"
```

### End-to-End Tests
- Test complete user flows
- All services running
- Slow execution
- Critical user journeys only

**Example**:
```typescript
// tests/e2e/profile-creation.test.ts
test('user can create profile', async ({ page }) => {
  await page.goto('http://localhost:4101/app/profile/create');

  await page.fill('input[name="name"]', 'Test User');
  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
  await expect(page.locator('.profile-name')).toContainText('Test User');
});
```

### Contract Tests
- Verify services honor shared contracts
- Check API schemas
- Prevent breaking changes

**Example**:
```python
# tests/contracts/test_user_registration.py
def test_registration_endpoint_matches_contract():
    # Load contract
    with open('shared/contracts/user-registration/feature.yaml') as f:
        contract = yaml.safe_load(f)

    # Test endpoint
    response = client.post("/api/user-registration", json=valid_data)

    # Verify response matches contract schema
    assert_matches_schema(response.json(), contract['schemas']['response'])
```

---

## Deployment Coordination

### Deployment Order

When deploying cross-service features, follow this order to minimize breakage:

#### 1. Deploy Shared Resources
```bash
# Deploy shared models and contracts first
docker-compose build shared
docker-compose up -d shared
```

**Why first?** All services depend on shared resources.

#### 2. Deploy Data Layer
```bash
# Deploy repository services
docker-compose build back-postgres back-cassandra
docker-compose up -d back-postgres back-cassandra
```

**Why second?** Backend services depend on data layer.

#### 3. Deploy Backend Services
```bash
# Deploy auth and API services
docker-compose build back-auth back-api
docker-compose up -d back-auth back-api
```

**Why third?** Frontend depends on backend.

#### 4. Deploy Frontend Services
```bash
# Deploy frontend last
docker-compose build front-public front-admin
docker-compose up -d front-public front-admin
```

**Why last?** Frontend is the entry point, deploy after all dependencies ready.

### Rollback Order

If deployment fails, rollback in **reverse order**:

```bash
# 1. Rollback frontend
docker-compose down front-public front-admin
docker-compose up -d front-public front-admin  # Previous version

# 2. Rollback backend
docker-compose down back-api back-auth
docker-compose up -d back-api back-auth  # Previous version

# 3. Rollback data layer (if schema changed)
docker-compose down back-postgres
# Restore database backup
docker-compose up -d back-postgres

# 4. Rollback shared (if incompatible)
docker-compose down shared
docker-compose up -d shared  # Previous version
```

### Feature Flags

For safer deployments, use feature flags:

```python
# back-api/features/new-feature/api.py
from feature_registry import is_enabled

@router.post("/api/new-feature")
async def new_feature_endpoint():
    if not await is_enabled("new-feature"):
        raise HTTPException(status_code=404, detail="Not found")

    # Feature implementation
    ...
```

```typescript
// front-public/app/features/new-feature/routes/index.tsx
export async function loader() {
  const enabled = await featureRegistry.isEnabled("new-feature");

  if (!enabled) {
    throw new Response("Not found", { status: 404 });
  }

  // Feature implementation
  ...
}
```

### Blue-Green Deployment

For zero-downtime deployments of cross-service features:

1. **Deploy new version** alongside old (blue/green)
2. **Route traffic** gradually to new version
3. **Monitor** for errors
4. **Switch fully** to new version
5. **Decommission** old version

---

## Common Scenarios

### Scenario 1: Adding a User-Facing Feature

**Example**: User profile customization

**Services Involved**:
- front-public (UI)
- back-api (business logic)
- back-postgres (data storage)
- shared (models and contracts)

**Implementation**:
```
1. Define shared models (shared/models/profile.py)
2. Create repository (back-postgres/repositories/profile_repository.py)
3. Implement backend API (back-api/features/profile/*)
4. Create frontend UI (front-public/app/features/profile/*)
5. Test end-to-end
```

### Scenario 2: Adding an Admin Feature

**Example**: User role management

**Services Involved**:
- front-admin (admin UI)
- back-api (role logic)
- back-auth (permission validation)
- back-postgres (data storage)
- shared (models and contracts)

**Implementation**:
```
1. Define Role model (shared/models/user.py)
2. Update user repository (back-postgres/repositories/user_repository.py)
3. Add role validation (back-auth/services/permission_service.py)
4. Implement role management API (back-api/features/user-roles/*)
5. Create admin UI (front-admin/app/features/user-roles/*)
6. Test with different roles
```

### Scenario 3: Adding Authentication Method

**Example**: GitHub OAuth

**Services Involved**:
- front-public (OAuth button)
- back-auth (OAuth flow)
- back-postgres (user storage)
- shared (models)

**Implementation**:
```
1. Create OAuth feature (back-auth/features/github-auth/*)
2. Update user model (shared/models/user.py) - add github_id field
3. Update repository (back-postgres/repositories/user_repository.py)
4. Add frontend button (front-public/app/features/user-registration/ui/LoginForm.tsx)
5. Test OAuth flow
```

### Scenario 4: Adding Background Task

**Example**: Monthly billing

**Services Involved**:
- back-workers (task execution)
- back-api (trigger task)
- back-postgres (billing data)
- shared (models)

**Implementation**:
```
1. Define BillingTask model (shared/models/billing.py)
2. Create repository methods (back-postgres/repositories/billing_repository.py)
3. Implement task (back-workers/tasks/billing.py)
4. Add trigger endpoint (back-api/features/billing/api.py)
5. Schedule task (back-workers/celeryconfig.py)
6. Test task execution
```

### Scenario 5: Adding Real-Time Feature

**Example**: Live notifications

**Services Involved**:
- front-public (WebSocket client)
- back-websockets (WebSocket server)
- back-redis (pub/sub)
- back-api (notification trigger)
- shared (message schemas)

**Implementation**:
```
1. Define notification schema (shared/models/notification.py)
2. Set up WebSocket route (back-websockets/routes/notifications.py)
3. Configure Redis pub/sub (back-redis/pubsub.py)
4. Add notification trigger (back-api/features/notifications/domain.py)
5. Implement frontend WebSocket client (front-public/app/features/notifications/*)
6. Test real-time message flow
```

---

## Troubleshooting

### Problem: Changes in One Service Break Another

**Symptoms**:
- Service A works fine
- Service B throws errors after Service A deployment

**Root Cause**:
- Breaking change in shared resource
- API contract changed
- Service dependency version mismatch

**Solutions**:

1. **Check shared resource versions**:
```bash
# Compare versions in feature.yaml files
grep -r "version:" */features/*/feature.yaml
```

2. **Verify API contracts**:
```bash
# Check if endpoints match contracts
diff shared/contracts/feature-name/feature.yaml back-api/features/feature-name/feature.yaml
```

3. **Use contract tests**:
```python
# Add contract test to prevent future breaks
def test_api_matches_contract():
    assert_api_matches_contract(
        api_spec="back-api/features/feature-name/api.py",
        contract="shared/contracts/feature-name/feature.yaml"
    )
```

### Problem: Cross-Service Race Conditions

**Symptoms**:
- Intermittent failures
- Works sometimes, fails other times
- Error: "Resource not found" but it was just created

**Root Cause**:
- Async operations not properly coordinated
- Service B queries before Service A commits
- Eventually consistent data not waited for

**Solutions**:

1. **Use transactional outbox pattern**:
```python
# back-api/features/orders/domain.py
async def create_order(order_data):
    async with db.transaction():
        # Create order
        order = await postgres_service.create_order(order_data)

        # Add event to outbox table
        await postgres_service.add_outbox_event({
            "type": "order.created",
            "data": order.dict()
        })

    # Worker picks up event and processes async
    return order
```

2. **Add retry logic**:
```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def get_created_resource(id: str):
    return await service.get(id)
```

3. **Use correlation IDs**:
```python
# Track requests across services
import uuid

correlation_id = str(uuid.uuid4())

# Service A
await service_b.create(data, headers={"X-Correlation-ID": correlation_id})

# Service B logs
logger.info("Processing request", extra={"correlation_id": correlation_id})
```

### Problem: Circular Dependencies

**Symptoms**:
- Import errors
- Services can't start
- "Cannot import X from Y"

**Root Cause**:
- Service A depends on Service B
- Service B depends on Service A
- Circular import

**Solutions**:

1. **Extract to shared**:
```python
# Move shared code to shared/
# shared/utils/common.py
def shared_function():
    pass

# Service A
from shared.utils.common import shared_function

# Service B
from shared.utils.common import shared_function
```

2. **Use dependency injection**:
```python
# back-api/features/orders/domain.py
class OrderDomain:
    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def create_order(self, order_data):
        user = await self.user_service.get(order_data.user_id)
        # ...
```

3. **Event-driven architecture**:
```python
# Instead of direct calls, use events
# Service A
await redis.publish("user.created", user.dict())

# Service B
async def on_user_created(user_data):
    # Handle user creation
    pass
```

### Problem: Inconsistent Data Across Services

**Symptoms**:
- Database A has data, Database B doesn't
- Counts don't match
- Data out of sync

**Root Cause**:
- Partial failure (one service succeeded, another failed)
- No distributed transaction
- Eventual consistency issues

**Solutions**:

1. **Implement saga pattern**:
```python
# back-api/features/checkout/domain.py
async def checkout_saga(order_data):
    try:
        # Step 1: Reserve inventory
        reservation = await inventory_service.reserve(order_data.items)

        # Step 2: Process payment
        payment = await payment_service.charge(order_data.payment)

        # Step 3: Create order
        order = await order_service.create(order_data)

        return order

    except Exception as e:
        # Rollback in reverse order
        if payment:
            await payment_service.refund(payment.id)
        if reservation:
            await inventory_service.release(reservation.id)
        raise
```

2. **Use idempotency keys**:
```python
@router.post("/api/payment")
async def process_payment(
    payment_data: PaymentData,
    idempotency_key: str = Header(...)
):
    # Check if already processed
    existing = await redis.get(f"payment:{idempotency_key}")
    if existing:
        return existing

    # Process payment
    result = await payment_service.charge(payment_data)

    # Store result
    await redis.setex(
        f"payment:{idempotency_key}",
        3600,  # 1 hour
        result.json()
    )

    return result
```

3. **Implement compensating transactions**:
```python
async def create_subscription(user_id, plan):
    steps = []

    try:
        # Step 1
        user = await user_service.upgrade(user_id, plan)
        steps.append(("downgrade_user", user_id))

        # Step 2
        invoice = await billing_service.create_invoice(user_id, plan)
        steps.append(("cancel_invoice", invoice.id))

        # Step 3
        await email_service.send_welcome(user_id)

        return user

    except Exception:
        # Compensate in reverse
        for action, *args in reversed(steps):
            await compensate(action, *args)
        raise
```

### Problem: Testing Cross-Service Features

**Symptoms**:
- Hard to test in isolation
- Need all services running
- Tests are slow

**Solutions**:

1. **Use service mocks**:
```python
# tests/conftest.py
@pytest.fixture
def mock_auth_service():
    mock = MagicMock(spec=AuthService)
    mock.verify_token.return_value = {"user_id": "test-user"}
    return mock

# tests/test_api.py
async def test_protected_endpoint(mock_auth_service):
    domain = ApiDomain(auth_service=mock_auth_service)
    result = await domain.get_user_data("test-token")
    assert result is not None
```

2. **Use test containers**:
```python
# tests/conftest.py
import testcontainers.postgres

@pytest.fixture(scope="session")
def postgres_container():
    with testcontainers.postgres.PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture
async def test_db(postgres_container):
    db = await connect(postgres_container.get_connection_url())
    await db.execute("CREATE TABLE users (...)")
    yield db
    await db.close()
```

3. **Use contract testing**:
```python
# Generate mocks from contracts
from pact import Consumer, Provider

pact = Consumer("front-public").has_pact_with(Provider("back-api"))

pact.given("user exists") \
    .upon_receiving("a request for user data") \
    .with_request("GET", "/api/user/123") \
    .will_respond_with(200, body={"id": "123", "name": "Test"})

# Run tests
with pact:
    response = await client.get("/api/user/123")
    assert response.json()["name"] == "Test"

# Verify provider honors contract
pact.verify()
```

---

## Summary

### Key Takeaways

1. **Plan Scope First**: Identify all services before coding
2. **Define Contracts**: Create shared contracts and models first
3. **Respect Boundaries**: Never cross service responsibilities
4. **Implement in Order**: Shared → Data → Backend → Frontend
5. **Test at All Levels**: Unit, integration, E2E, contract tests
6. **Deploy Carefully**: Follow deployment order, use feature flags
7. **Monitor and Rollback**: Have rollback plan ready

### Quick Reference Checklist

When implementing a cross-service feature:

- [ ] Identify all services involved
- [ ] Define data flow diagram
- [ ] Create shared models and contracts
- [ ] Implement data layer (repositories)
- [ ] Implement backend logic (back-api)
- [ ] Add authentication if needed (back-auth)
- [ ] Implement frontend (front-public/front-admin)
- [ ] Write unit tests per service
- [ ] Write integration tests
- [ ] Write E2E tests for critical flows
- [ ] Update all feature.yaml files
- [ ] Document cross-service dependencies
- [ ] Plan deployment order
- [ ] Test rollback procedure
- [ ] Deploy to staging first
- [ ] Monitor after production deploy

### Need Help?

- **Service boundaries unclear**: Read `{service}/CONTEXT.md`
- **Cross-service patterns**: Review this guide
- **Creating agents**: See `.claude/agents/README.md`
- **Feature examples**: Check existing features in `*/features/`
- **Testing strategy**: See Testing section above
- **Deployment issues**: See Deployment Coordination section

---

**Last Updated**: 2025-11-12
**Maintainer**: Development Team
