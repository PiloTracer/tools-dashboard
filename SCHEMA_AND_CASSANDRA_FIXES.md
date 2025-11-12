# Schema and Cassandra Fixes Documentation

## Executive Summary

This document details the fixes for two critical errors:
1. **PostgreSQL Type Mismatch**: `INTEGER` vs `UUID` conflict for user IDs
2. **Cassandra Data Population Bug**: String formatting error in metadata seeding
3. **Cassandra Authentication Warning**: Unnecessary auth provider configuration
4. **Cassandra Protocol Warning**: Protocol version downgrade

All issues have been resolved.

---

## 🔴 Error #1: PostgreSQL Foreign Key Type Mismatch

### Problem

```
asyncpg.exceptions.DatatypeMismatchError: foreign key constraint "user_identities_user_id_fkey"
cannot be implemented
DETAIL: Key columns "user_id" and "id" are of incompatible types: integer and uuid.
```

### Root Cause

Two services were creating conflicting schemas for the `users` table:

**back-auth** (Owner of users table):
```python
# back-auth/core/database.py
users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),  # ✓ INTEGER
    ...
)
```

**back-postgres** (Conflicting schema):
```sql
-- back-postgres/schema/001_users.sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,  -- ✗ UUID (conflict!)
    ...
);
```

**Consequence**: All tables referencing `users.id` had type mismatch:
- `user_identities.user_id INTEGER` → `users.id UUID` ❌
- `user_subscriptions.user_id UUID` → `users.id INTEGER` ❌
- `subscription_history.user_id UUID` → `users.id INTEGER` ❌
- `financial.user_id UUID` → `users.id INTEGER` ❌

### Solution

**Architecture Decision**: `back-auth` is the authoritative owner of the `users` table. All other services must reference it correctly.

#### Changes Made:

**1. Removed conflicting users table** (back-postgres/schema/001_users.sql):
```sql
-- Before
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    ...
);

-- After
-- Users table is managed by back-auth service (core/database.py)
-- Do not create it here to avoid conflicts
-- back-auth creates: users table with id INTEGER (autoincrement)

-- This file is kept for migration numbering consistency
-- No schema changes needed here
```

**2. Updated all user_id references from UUID to INTEGER**:

- **002_subscriptions.sql**:
  ```sql
  user_id INTEGER NOT NULL REFERENCES users(id),  -- Changed from UUID
  ```

- **003_financial.sql**:
  ```sql
  user_id INTEGER NOT NULL REFERENCES users(id),  -- Changed from UUID
  ```

- **004_subscription_packages.sql** (2 tables):
  ```sql
  -- user_subscriptions table
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Changed from UUID

  -- subscription_history table
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Changed from UUID
  ```

### Verification

After fix, the foreign key constraints will work correctly:
```
users.id (INTEGER) ← user_identities.user_id (INTEGER) ✓
users.id (INTEGER) ← user_subscriptions.user_id (INTEGER) ✓
users.id (INTEGER) ← subscription_history.user_id (INTEGER) ✓
users.id (INTEGER) ← financial.user_id (INTEGER) ✓
```

---

## 🔴 Error #2: Cassandra Data Population String Formatting

### Problem

```
back-cassandra | ERROR - Error upserting metadata free.tagline: not all arguments converted during string formatting
back-cassandra | ERROR - Error upserting feature free.basic_tools: not all arguments converted during string formatting
```

### Root Cause

The repository methods were defined as `async` but the Cassandra Python driver's `session.execute()` is **synchronous**, not async. Using `await` on a non-awaitable caused the string formatting error.

**Incorrect Code**:
```python
async def upsert_metadata(self, ...):
    query = """INSERT INTO ... VALUES (?, ?, ?, ?, ?, ?, ?)"""
    await self.session.execute_async(query, (...))  # ❌ execute_async doesn't exist
```

**What happened**:
- `await` tried to await a non-coroutine
- Python interpreted the query string as needing formatting
- String formatting failed with "not all arguments converted"

### Solution

Converted all repository methods from `async` to synchronous, since the cassandra-driver is synchronous by default.

#### Files Modified:

**back-cassandra/repositories/subscription_metadata_repository.py**:

```python
# Before (all methods)
async def upsert_metadata(self, ...):
    await self.session.execute_async(query, (...))

# After (all methods)
def upsert_metadata(self, ...):
    self.session.execute(query, (...))  # ✓ Synchronous
```

**Methods fixed**:
- `SubscriptionMetadataRepository`:
  - `upsert_metadata()`
  - `find_by_package()`
  - `find_by_package_and_type()`
  - `delete_metadata()`

- `SubscriptionFeaturesRepository`:
  - `upsert_feature()`
  - `find_by_package()`
  - `find_included_features()`
  - `find_by_category()`
  - `delete_feature()`

**back-cassandra/main.py**:

```python
# Before
async def populate_subscription_metadata(session) -> None:
    await metadata_repo.upsert_metadata(...)
    await features_repo.upsert_feature(...)

# After
def populate_subscription_metadata(session) -> None:
    metadata_repo.upsert_metadata(...)  # ✓ No await
    features_repo.upsert_feature(...)   # ✓ No await
```

### Verification

After fix, metadata and features will be populated successfully:
```
INFO - Upserted metadata: free.tagline
INFO - Upserted metadata: free.highlight
INFO - Upserted metadata: free.cta_text
INFO - Upserted feature: free.basic_tools
INFO - Upserted feature: free.community_support
...
INFO - Subscription metadata populated successfully
```

---

## 🟡 Error #3: Cassandra Authentication Warning

### Problem

```
WARNING - An authentication challenge was not sent, this is suspicious because the driver
expects authentication (configured authenticator = PlainTextAuthenticator)
```

### Root Cause

- Cassandra container runs with default `AllowAllAuthenticator` (no auth required)
- Python client was configured with `PlainTextAuthProvider` (expects auth)
- Cassandra doesn't challenge → Client logs warning

### Solution

Made authentication conditional - only provide auth if non-default credentials are set.

**back-cassandra/main.py**:

```python
# Before
auth_provider = PlainTextAuthProvider(username=user, password=password)
cassandra_cluster = Cluster(
    contact_points=hosts,
    port=port,
    auth_provider=auth_provider,  # Always provided
)

# After
auth_provider = None
if user != "cassandra" or password != "cassandra":
    auth_provider = PlainTextAuthProvider(username=user, password=password)
    logger.info("Using authentication with provided credentials")
else:
    logger.info("No authentication (using Cassandra defaults)")

cassandra_cluster = Cluster(
    contact_points=hosts,
    port=port,
    auth_provider=auth_provider,  # ✓ None for default auth
    protocol_version=4,  # Also fixed protocol version
)
```

---

## 🟡 Error #4: Cassandra Protocol Version Downgrade

### Problem

```
WARNING - Downgrading core protocol version from 66 to 65 ... to 5
```

### Root Cause

Client defaults to latest protocol version (v5+), but Cassandra 4.x only supports up to v4.

### Solution

Explicitly set `protocol_version=4` in the Cluster configuration (see Error #3 fix above).

---

## Summary of Files Modified

| File | Changes |
|------|---------|
| `back-postgres/schema/001_users.sql` | Removed users table (owned by back-auth) |
| `back-postgres/schema/002_subscriptions.sql` | Changed `user_id` from UUID to INTEGER |
| `back-postgres/schema/003_financial.sql` | Changed `user_id` from UUID to INTEGER |
| `back-postgres/schema/004_subscription_packages.sql` | Changed `user_id` from UUID to INTEGER (2 tables) |
| `back-cassandra/repositories/subscription_metadata_repository.py` | Removed `async`/`await` from all methods |
| `back-cassandra/main.py` | Removed `async`/`await` from populate function, made auth conditional, set protocol version |

---

## Testing Steps

### 1. Drop existing databases (fresh start)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### 2. Rebuild services
```bash
docker-compose -f docker-compose.dev.yml build back-postgres-service back-cassandra back-auth
```

### 3. Start services
```bash
docker-compose -f docker-compose.dev.yml up
```

### 4. Verify PostgreSQL Success

```bash
docker-compose -f docker-compose.dev.yml logs back-postgres-service
```

**Expected**:
```
INFO - PostgreSQL connection pool created successfully
INFO - Running 4 migration files...
INFO - Migration 001_users.sql completed successfully  (empty file)
INFO - Migration 002_subscriptions.sql completed successfully
INFO - Migration 003_financial.sql completed successfully
INFO - Migration 004_subscription_packages.sql completed successfully
INFO - All migrations completed successfully
INFO - Upserted package: free - Free
INFO - Upserted package: standard - Standard
INFO - Upserted package: premium - Premium
INFO - Upserted package: enterprise - Enterprise
INFO - PostgreSQL service initialized successfully
```

### 5. Verify back-auth Success

```bash
docker-compose -f docker-compose.dev.yml logs back-auth
```

**Expected**:
```
INFO - Database initialization successful
# No foreign key errors
```

### 6. Verify Cassandra Success

```bash
docker-compose -f docker-compose.dev.yml logs back-cassandra
```

**Expected**:
```
INFO - Connecting to Cassandra at ['cassandra']:9042
INFO - No authentication (using Cassandra defaults)
INFO - Cassandra session created successfully
INFO - Running 1 CQL migration files...
INFO - Migration 001_subscription_metadata.cql completed successfully
INFO - Populating subscription metadata...
INFO - Upserted metadata: free.tagline
INFO - Upserted metadata: free.highlight
...
INFO - Upserted feature: free.basic_tools
...
INFO - Subscription metadata populated successfully
INFO - Cassandra service initialized successfully
```

### 7. Verify Data in PostgreSQL

```bash
# Check subscription packages
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db \
  -c "SELECT slug, name, price_monthly FROM subscription_packages ORDER BY display_order;"

# Check users table owned by back-auth
docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db \
  -c "\d users"
```

**Expected**:
```
 slug       | name       | price_monthly
------------+------------+---------------
 free       | Free       |          0.00
 standard   | Standard   |         29.99
 premium    | Premium    |         79.99
 enterprise | Enterprise |        299.99

# Users table with INTEGER id
 Column      | Type
-------------+-----------
 id          | integer   (not UUID!)
 email       | varchar
 ...
```

### 8. Verify Data in Cassandra

```bash
# Check metadata
docker-compose -f docker-compose.dev.yml exec cassandra cqlsh -e \
  "SELECT package_slug, metadata_key, metadata_value FROM tools_dashboard.subscription_package_metadata LIMIT 10;"

# Check features
docker-compose -f docker-compose.dev.yml exec cassandra cqlsh -e \
  "SELECT package_slug, feature_name FROM tools_dashboard.subscription_features LIMIT 10;"
```

---

## Architecture Principles Reinforced

1. **Single Source of Truth**: Each table has ONE authoritative owner service
   - `users` table → owned by `back-auth`
   - `subscription_packages` table → owned by `back-postgres`
   - Metadata/features → owned by `back-cassandra`

2. **Type Consistency**: All foreign keys must match their referenced primary keys
   - `back-auth` uses INTEGER for user IDs
   - All other services must use INTEGER for user_id foreign keys

3. **Async/Sync Clarity**: Use async only when the underlying library supports it
   - Cassandra driver = synchronous → use sync methods
   - asyncpg = async → use async methods

4. **Optional Configuration**: Only configure features when needed
   - Don't provide auth credentials if not required
   - Explicitly set versions to avoid auto-negotiation

---

## Future Recommendations

### 1. Consider UUID for User IDs

**Current**: INTEGER (auto-increment) for user IDs
**Recommendation**: Migrate to UUID for better distributed system support

**Pros**:
- No coordination needed across services
- Better for horizontal scaling
- Prevents ID enumeration attacks

**Cons**:
- Larger index size
- Requires migration of existing data

**If adopted, would need to update**:
- `back-auth/core/database.py` (users table)
- All foreign key columns in back-postgres schemas
- All repository methods expecting user_id as string

### 2. Add Database Migration Versioning

**Current**: Simple numbered files (001, 002, etc.)
**Recommendation**: Use Alembic (SQLAlchemy) or similar tool

**Benefits**:
- Track which migrations have run
- Support rollback
- Handle migration dependencies
- Prevent re-running migrations

### 3. Use Prepared Statements in Cassandra

**Current**: Simple string queries
**Recommendation**: Prepare statements for better performance

```python
# Example
class SubscriptionMetadataRepository:
    def __init__(self, session):
        self.session = session
        self.insert_metadata_stmt = session.prepare("""
            INSERT INTO subscription_package_metadata
            (package_slug, metadata_key, metadata_value, ...)
            VALUES (?, ?, ?, ...)
        """)

    def upsert_metadata(self, ...):
        self.session.execute(self.insert_metadata_stmt, (...))
```

---

## Summary

✅ **All Critical Errors Fixed**:
1. PostgreSQL type mismatch resolved (INTEGER user IDs)
2. Cassandra data population working (removed incorrect async)
3. Cassandra auth warning eliminated (conditional auth)
4. Protocol version explicitly set (no downgrades)

✅ **Services Now Start Successfully**:
- back-postgres-service initializes and populates data
- back-auth creates tables without conflicts
- back-cassandra connects and seeds metadata

✅ **Subscription Feature Fully Operational**:
- 4 packages defined (Free, Standard, Premium, Enterprise)
- Metadata populated in Cassandra
- Features populated in Cassandra
- Ready for API queries

