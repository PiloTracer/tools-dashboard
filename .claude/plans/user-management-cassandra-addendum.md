# User Management - Cassandra Data Strategy Addendum

**Date**: 2025-11-13
**Related Plan**: `.claude/plans/user-management-implementation.md`

---

## Critical Architectural Insight: Dual-Database Pattern

### PostgreSQL vs Cassandra Data Strategy

Based on the existing codebase analysis, this project uses a **dual-database pattern**:

1. **PostgreSQL** (back-postgres):
   - **Normalized** relational data
   - Source of truth for core user identity
   - ACID transactions
   - Used for: user credentials, email, roles, status

2. **Cassandra** (back-cassandra):
   - **Denormalized/Canonical** data
   - Extended user profiles and metadata
   - Eventually consistent
   - Used for: progressive profiling data, extended user attributes, activity logs

---

## Current Cassandra Implementation Pattern

### Existing Repository Pattern (from subscription_metadata_repository.py)

```python
class SubscriptionMetadataRepository:
    def upsert_metadata(self, package_slug, metadata_key, metadata_value, ...):
        query = """
            INSERT INTO subscription_package_metadata
                (package_slug, metadata_key, metadata_value, ...)
            VALUES (%s, %s, %s, ...)
            USING TTL 31536000  # Critical: TTL for all writes
        """
        self.session.execute(query, [...])
```

### Key Cassandra Patterns Observed

1. **Upsert operations** (INSERT with idempotency)
2. **TTL (Time-To-Live)** on all writes (typically 1 year = 31536000 seconds)
3. **Prepared statements** for performance
4. **ALLOW FILTERING** for secondary queries (use sparingly)
5. **No transactions** - rely on idempotent operations

---

## User Data in Cassandra: Extended Profile Strategy

### What Goes in Cassandra for Users

Based on `user_ext_repository.py` and the architecture:

**Extended User Attributes**:
- Progressive profiling data (company, job title, phone, etc.)
- User preferences and settings
- Activity metadata
- Custom fields collected over time
- Denormalized user summary data (for fast reads)

**NOT in Cassandra**:
- Email (in PostgreSQL - source of truth)
- Password hash (in PostgreSQL - security)
- Role (in PostgreSQL - authorization)
- Status (in PostgreSQL - critical state)

### Current Implementation Status

**user_ext_repository.py** (currently minimal):
```python
class UserExtRepository:
    def __init__(self, session: Any) -> None:
        self.session = session

    async def upsert(self, user_id: str, payload: dict[str, Any]) -> None:
        # Currently a stub - needs implementation
        pass
```

**This needs to be enhanced during Phase 2!**

---

## Updated Phase 2: Cassandra Implementation Details

### Enhanced Tasks for back-cassandra

#### 1. Define Cassandra Schema (CQL)

Create table for extended user data:

```cql
CREATE TABLE IF NOT EXISTS user_extended_profiles (
    user_id UUID PRIMARY KEY,

    -- Progressive profiling data
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    department TEXT,
    industry TEXT,

    -- Preferences
    language TEXT,
    timezone TEXT,
    communication_preferences MAP<TEXT, BOOLEAN>,

    -- Metadata
    profile_completion_percentage INT,
    last_profile_update TIMESTAMP,
    onboarding_completed BOOLEAN,
    onboarding_step INT,

    -- Denormalized summary (for quick reads)
    email TEXT,  -- Denormalized from PostgreSQL
    role TEXT,   -- Denormalized from PostgreSQL
    status TEXT, -- Denormalized from PostgreSQL

    -- Timestamps
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) WITH comment = 'Extended user profile data and progressive profiling results';

-- Index for email lookups (if needed)
CREATE INDEX IF NOT EXISTS ON user_extended_profiles (email);
```

#### 2. Enhance user_ext_repository.py

Implement full CRUD operations following the subscription_metadata pattern:

```python
class UserExtRepository:
    """Repository for managing extended user profiles in Cassandra."""

    def __init__(self, session: Any) -> None:
        self.session = session
        self._prepare_statements()

    def _prepare_statements(self) -> None:
        """Prepare CQL statements for better performance."""
        # Prepare common queries
        pass

    def upsert_extended_profile(
        self,
        user_id: str,
        extended_data: dict[str, Any],
        denormalized_data: dict[str, Any] = None
    ) -> None:
        """
        Insert or update extended user profile.

        Args:
            user_id: User UUID
            extended_data: Extended profile fields (company, phone, etc.)
            denormalized_data: Denormalized data from PostgreSQL (email, role, status)
        """
        # Build dynamic query based on provided fields
        # Use TTL for data retention
        # Update profile_completion_percentage
        pass

    def get_extended_profile(self, user_id: str) -> dict[str, Any]:
        """Retrieve extended profile for a user."""
        query = """
            SELECT * FROM user_extended_profiles
            WHERE user_id = %s
        """
        result = self.session.execute(query, [user_id])
        return dict(result.one()) if result else {}

    def update_profile_fields(
        self,
        user_id: str,
        fields: dict[str, Any]
    ) -> None:
        """Update specific fields in extended profile."""
        # Partial update - only specified fields
        pass

    def sync_canonical_data(
        self,
        user_id: str,
        email: str,
        role: str,
        status: str
    ) -> None:
        """
        Sync denormalized/canonical data from PostgreSQL to Cassandra.

        This is called whenever core user data changes in PostgreSQL
        to keep the Cassandra canonical copy in sync.
        """
        query = """
            UPDATE user_extended_profiles
            SET email = %s, role = %s, status = %s, updated_at = %s
            WHERE user_id = %s
            USING TTL 31536000
        """
        now = datetime.utcnow()
        self.session.execute(query, [email, role, status, now, user_id])

    def delete_extended_profile(self, user_id: str) -> None:
        """Delete extended profile (GDPR compliance)."""
        query = "DELETE FROM user_extended_profiles WHERE user_id = %s"
        self.session.execute(query, [user_id])
```

---

## Critical: Canonical Data Synchronization

### When User Data Changes in PostgreSQL

**IMPORTANT**: Whenever core user data (email, role, status) is updated in PostgreSQL, we MUST sync to Cassandra.

### Update Flow for User Management

```
Admin updates user email in front-admin
    ↓
front-admin action calls back-api
    ↓
back-api domain logic validates
    ↓
back-api infrastructure layer:
    ├─→ Update PostgreSQL (source of truth)
    │   └─→ back-postgres: user_repository.update_user(email=new_email)
    │
    └─→ Sync to Cassandra (canonical copy)
        └─→ back-cassandra: user_ext_repository.sync_canonical_data(
                user_id, new_email, role, status
            )
```

### Code Example: back-api/features/user-management/infrastructure.py

```python
class UserManagementInfrastructure:
    def __init__(
        self,
        postgres_service: PostgresService,
        cassandra_service: CassandraService,
        auth_service: AuthService
    ):
        self.postgres = postgres_service
        self.cassandra = cassandra_service
        self.auth = auth_service

    async def update_user(
        self,
        user_id: str,
        update_data: UserUpdateRequest
    ) -> User:
        """
        Update user information across both databases.
        """
        # 1. Update PostgreSQL (source of truth)
        user = await self.postgres.user_repository.update_user(
            user_id, update_data
        )

        # 2. Sync canonical data to Cassandra
        await self.cassandra.user_ext_repository.sync_canonical_data(
            user_id=user.id,
            email=user.email,
            role=user.role,
            status=user.status
        )

        # 3. If extended profile fields provided, update those too
        if update_data.has_extended_fields():
            await self.cassandra.user_ext_repository.update_profile_fields(
                user_id=user.id,
                fields=update_data.extended_fields()
            )

        return user
```

---

## Updated Data Models

### UserUpdateRequest (enhanced)

```python
class UserUpdateRequest(BaseModel):
    # Core fields (PostgreSQL)
    email: Optional[str] = None

    # Extended fields (Cassandra)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    industry: Optional[str] = None

    # Preferences (Cassandra)
    language: Optional[str] = None
    timezone: Optional[str] = None

    def has_core_fields(self) -> bool:
        """Check if update contains PostgreSQL fields."""
        return self.email is not None

    def has_extended_fields(self) -> bool:
        """Check if update contains Cassandra fields."""
        return any([
            self.first_name, self.last_name, self.phone,
            self.company, self.job_title, self.department,
            self.industry, self.language, self.timezone
        ])

    def core_fields(self) -> dict:
        """Extract PostgreSQL fields."""
        return {"email": self.email} if self.email else {}

    def extended_fields(self) -> dict:
        """Extract Cassandra fields."""
        return {
            k: v for k, v in self.dict(exclude_unset=True).items()
            if k not in ["email"] and v is not None
        }
```

---

## Phase 2 Updated Task List

### back-cassandra/repositories/user_ext_repository.py

- [ ] Create CQL schema for `user_extended_profiles` table
- [ ] Implement `upsert_extended_profile()` method
- [ ] Implement `get_extended_profile()` method
- [ ] Implement `update_profile_fields()` method (partial updates)
- [ ] **Implement `sync_canonical_data()` method** (CRITICAL for data consistency)
- [ ] Implement `delete_extended_profile()` method (GDPR)
- [ ] Use TTL on all writes (31536000 seconds = 1 year)
- [ ] Write unit tests for all methods

### back-api/features/user-management/infrastructure.py

- [ ] Inject both PostgresService and CassandraService
- [ ] On user update:
  - [ ] Update PostgreSQL first (source of truth)
  - [ ] Sync canonical data to Cassandra
  - [ ] Update extended fields in Cassandra if provided
- [ ] Handle errors gracefully (if Cassandra fails, PostgreSQL still succeeds)
- [ ] Log synchronization operations for debugging

---

## Front-Public Future Considerations

### No Current Implementation Needed

As you correctly noted, **NO development is necessary for front-public** in this user-management feature.

However, we must design the back-api endpoints to be **reusable by front-public** in the future.

### Future Use Case: User Profile Completion

When front-public implements profile completion (progressive profiling):

```
User completes profile form in front-public
    ↓
front-public action calls back-api (same endpoint!)
    ↓
back-api/features/user-management/api.py
    PUT /api/users/:id  (not /api/admin/users/:id)
    ↓
Updates both PostgreSQL and Cassandra
```

### Design for Reusability

#### Create TWO sets of endpoints:

**Admin Endpoints** (front-admin only):
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/users/:id` - View any user (admin only)
- `PUT /api/admin/users/:id` - Update any user (admin only)
- `PATCH /api/admin/users/:id/status` - Change status (admin only)
- `POST /api/admin/users/:id/roles` - Assign roles (admin only)

**User Endpoints** (front-public + front-admin):
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update own profile
- `GET /api/users/me/extended` - Get extended profile data

This way:
- Admin uses `/api/admin/users/:id` to manage ANY user
- Regular user uses `/api/users/me` to manage THEIR OWN profile
- **Same underlying infrastructure** for both!

---

## Updated Implementation Plan Summary

### Phase 2 Now Includes

1. **Cassandra Schema Definition**
   - Create `user_extended_profiles` table
   - Define indexes

2. **user_ext_repository.py Enhancement**
   - Full CRUD operations
   - **Canonical data sync method**
   - TTL on all writes
   - Prepared statements

3. **Dual-Database Update Pattern**
   - PostgreSQL updated first (source of truth)
   - Cassandra synced second (canonical copy)
   - Error handling for partial failures

4. **Data Model Enhancements**
   - Separate core vs extended fields
   - Helper methods for field extraction

---

## Testing Strategy for Dual-Database Updates

### Integration Tests Must Verify

1. **Update in PostgreSQL succeeds** → Verify data in PostgreSQL
2. **Sync to Cassandra succeeds** → Verify data in Cassandra
3. **Both databases consistent** → Compare data across databases
4. **Cassandra failure doesn't block PostgreSQL** → PostgreSQL succeeds even if Cassandra fails
5. **Eventual consistency** → Cassandra catch up on retry

### Test Example

```python
async def test_update_user_syncs_both_databases():
    # Update user email
    user = await api.update_user(
        user_id="123",
        update_data={"email": "new@example.com", "company": "Acme Corp"}
    )

    # Verify PostgreSQL (source of truth)
    pg_user = await postgres.user_repository.get_user("123")
    assert pg_user.email == "new@example.com"

    # Verify Cassandra (canonical copy)
    cass_user = await cassandra.user_ext_repository.get_extended_profile("123")
    assert cass_user["email"] == "new@example.com"
    assert cass_user["company"] == "Acme Corp"

    # Both databases consistent
    assert pg_user.email == cass_user["email"]
```

---

## Answers to Your Questions

### 1. ✅ Cassandra Canonical Data Handling

**Confirmed**: When updating a user:
- PostgreSQL is updated (source of truth)
- Cassandra is synced with canonical/denormalized data (email, role, status)
- Extended profile fields are updated in Cassandra
- Pattern follows existing `subscription_metadata_repository.py` approach

### 2. ✅ Starting Prompt Confirmation

**Confirmed**: To start ANY new session for user-management:
1. Open `.claude/USER-MANAGEMENT-START-HERE.md`
2. Copy the prompt under "Copy This Prompt to Start Working"
3. Paste in Claude Code
4. You're ready to go!

This prompt loads all necessary context automatically.

### 3. ✅ Front-Public Future Considerations

**Confirmed**: No front-public development needed NOW, but:
- Design back-api endpoints for reusability
- Create separate `/api/users/me` endpoints for user self-service
- Use same infrastructure (dual-database sync) for both admin and user updates
- When front-public implements profile completion, it will call `/api/users/me`

---

## Critical Reminders

1. **Always sync PostgreSQL → Cassandra** when core user data changes
2. **PostgreSQL is source of truth** for email, role, status
3. **Cassandra is source of truth** for extended profile data
4. **Use TTL on all Cassandra writes** (31536000 seconds)
5. **Handle Cassandra failures gracefully** (don't block PostgreSQL updates)
6. **Design for reusability** (front-public will use same endpoints later)

---

**Addendum Created**: 2025-11-13
**Integration Status**: Integrated into Phase 2 of main implementation plan
**Review**: Required reading before implementing Phase 2
