# Database Connection Fix Documentation

## Problem Summary

The `back-postgres-service` and `back-cassandra` services were failing to connect to their respective databases with "Connection refused" errors (errno 111). This was happening because the services were attempting to connect to `localhost` instead of using Docker's internal DNS to connect to the database containers.

## Root Cause

In Docker Compose, each service runs in its own container with its own network namespace. When a service tries to connect to `localhost`, it's connecting to itself, not to other containers. To communicate between containers, services must use the **container service names** as hostnames (e.g., `postgresql`, `cassandra`).

### What Was Wrong

**back-postgres/main.py:**
- Was using individual environment variables with defaults to `localhost`:
  ```python
  DB_HOST = os.getenv("POSTGRES_HOST", "localhost")  # ❌ Wrong
  ```
- Docker Compose was providing `DATABASE_URL` but the code wasn't parsing it

**back-cassandra/main.py:**
- Was using `CASSANDRA_HOSTS` with default `localhost`:
  ```python
  CASSANDRA_HOSTS = os.getenv("CASSANDRA_HOSTS", "localhost")  # ❌ Wrong
  ```
- Docker Compose was providing `CASSANDRA_CONTACT_POINTS` but the code wasn't using it

## Solutions Implemented

### 1. PostgreSQL Connection Fix (back-postgres/main.py)

**Changes Made:**
- Added `parse_database_url()` function to parse the `DATABASE_URL` connection string
- Added `get_db_config()` function to prioritize `DATABASE_URL` over individual env vars
- Changed default host from `localhost` to `postgresql` (Docker service name)
- Added retry logic with exponential backoff (5 retries, starting at 2 seconds)

**Before:**
```python
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
pool = await asyncpg.create_pool(host=DB_HOST, ...)
```

**After:**
```python
def get_db_config() -> dict[str, str | int]:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return parse_database_url(database_url)  # ✅ Parse full URL
    return {
        "host": os.getenv("POSTGRES_HOST", "postgresql"),  # ✅ Docker service name
        ...
    }

async def create_db_pool() -> asyncpg.Pool:
    # ... with retry logic
    for attempt in range(1, max_retries + 1):
        try:
            pool = await asyncpg.create_pool(**db_config)
            return pool
        except Exception as e:
            # Retry with exponential backoff
```

### 2. Cassandra Connection Fix (back-cassandra/main.py)

**Changes Made:**
- Added `get_cassandra_config()` function to use `CASSANDRA_CONTACT_POINTS` from Docker Compose
- Changed default host from `localhost` to `cassandra` (Docker service name)
- Added retry logic with exponential backoff (5 retries, starting at 2 seconds)

**Before:**
```python
CASSANDRA_HOSTS = os.getenv("CASSANDRA_HOSTS", "localhost").split(",")
cassandra_cluster = Cluster(contact_points=CASSANDRA_HOSTS, ...)
```

**After:**
```python
def get_cassandra_config() -> dict:
    contact_points = os.getenv("CASSANDRA_CONTACT_POINTS")
    if contact_points:
        hosts = contact_points.split(",")
    else:
        hosts = os.getenv("CASSANDRA_HOSTS", "cassandra").split(",")  # ✅ Docker service name
    return {"hosts": [host.strip() for host in hosts], ...}

def create_cassandra_session():
    # ... with retry logic
    for attempt in range(1, max_retries + 1):
        try:
            cassandra_cluster = Cluster(contact_points=hosts, ...)
            return cassandra_session
        except Exception as e:
            # Retry with exponential backoff
```

### 3. Retry Logic with Exponential Backoff

Both services now implement connection retry logic:
- **Max retries:** 5 attempts
- **Initial delay:** 2 seconds
- **Backoff strategy:** Exponential (2s → 4s → 8s → 16s → 32s)
- **Total wait time:** ~62 seconds maximum

This handles cases where:
- Database containers are still initializing
- Database services haven't completed startup checks
- Network connections are temporarily unavailable

## Docker Compose Configuration

The docker-compose files were already correctly configured with the right environment variables:

### docker-compose.dev.yml
```yaml
services:
  back-postgres-service:
    environment:
      - DATABASE_URL=postgresql://user:pass@postgresql:5432/main_db  # ✅ Correct
    depends_on:
      postgresql:
        condition: service_healthy  # ✅ Waits for PostgreSQL to be healthy

  back-cassandra:
    environment:
      - CASSANDRA_CONTACT_POINTS=cassandra  # ✅ Correct
    depends_on:
      cassandra:
        condition: service_healthy  # ✅ Waits for Cassandra to be healthy

  postgresql:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d main_db"]
      interval: 5s
      timeout: 5s
      retries: 5

  cassandra:
    image: cassandra:4
    healthcheck:
      test: ["CMD-SHELL", "cqlsh -e 'describe cluster'"]
      interval: 10s
      timeout: 10s
      retries: 10
```

## How Docker Networking Works

### Container DNS Resolution
```
┌─────────────────────────────────────────────────────────┐
│  Docker Network: tools-dashboard_default                │
│                                                           │
│  ┌──────────────┐      connects to      ┌─────────────┐│
│  │ back-postgres│─────"postgresql"─────▶│ postgresql  ││
│  │   service    │                        │  container  ││
│  └──────────────┘                        └─────────────┘│
│                                                           │
│  ┌──────────────┐      connects to      ┌─────────────┐│
│  │back-cassandra│─────"cassandra"──────▶│  cassandra  ││
│  │   service    │                        │  container  ││
│  └──────────────┘                        └─────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Key Concepts:
1. **Service Names = Hostnames**: Docker Compose automatically creates DNS entries for each service
2. **Internal Network**: Services can communicate using service names (e.g., `postgresql`, `cassandra`)
3. **localhost = Self**: Inside a container, `localhost` refers to that container only, not other services
4. **Health Checks**: `depends_on` with `condition: service_healthy` ensures databases are ready before connecting

## Verification Steps

### 1. Stop All Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### 2. Rebuild Services
```bash
docker-compose -f docker-compose.dev.yml build back-postgres-service back-cassandra
```

### 3. Start Services
```bash
docker-compose -f docker-compose.dev.yml up
```

### 4. Check Logs for Success

**PostgreSQL Service:**
```bash
docker-compose -f docker-compose.dev.yml logs back-postgres-service
```

**Expected output:**
```
back-postgres-service | Connecting to PostgreSQL at postgresql:5432/main_db
back-postgres-service | PostgreSQL connection pool created successfully
back-postgres-service | Running 4 migration files...
back-postgres-service | Executing migration: 001_users.sql
back-postgres-service | Migration 001_users.sql completed successfully
back-postgres-service | ...
back-postgres-service | Populating subscription packages...
back-postgres-service | Upserted package: free - Free
back-postgres-service | ...
back-postgres-service | PostgreSQL service initialized successfully
```

**Cassandra Service:**
```bash
docker-compose -f docker-compose.dev.yml logs back-cassandra
```

**Expected output:**
```
back-cassandra | Connecting to Cassandra at ['cassandra']:9042
back-cassandra | Cassandra session created successfully
back-cassandra | Running 1 CQL migration files...
back-cassandra | Executing migration: 001_subscription_metadata.cql
back-cassandra | Migration 001_subscription_metadata.cql completed successfully
back-cassandra | Populating subscription metadata...
back-cassandra | Upserted metadata: free.tagline
back-cassandra | ...
back-cassandra | Cassandra service initialized successfully
```

## Troubleshooting

### Issue: "Failed to connect after 5 attempts"

**Possible Causes:**
1. Database container isn't running
2. Database health check is failing
3. Network connectivity issues

**Solutions:**
```bash
# Check if database containers are running
docker-compose -f docker-compose.dev.yml ps

# Check database health status
docker-compose -f docker-compose.dev.yml ps postgresql
docker-compose -f docker-compose.dev.yml ps cassandra

# View database logs
docker-compose -f docker-compose.dev.yml logs postgresql
docker-compose -f docker-compose.dev.yml logs cassandra

# Restart database containers
docker-compose -f docker-compose.dev.yml restart postgresql cassandra
```

### Issue: "Connection refused" still appearing

**Check environment variables:**
```bash
# PostgreSQL
docker-compose -f docker-compose.dev.yml exec back-postgres-service env | grep DATABASE_URL

# Cassandra
docker-compose -f docker-compose.dev.yml exec back-cassandra env | grep CASSANDRA
```

**Expected values:**
- `DATABASE_URL=postgresql://user:pass@postgresql:5432/main_db`
- `CASSANDRA_CONTACT_POINTS=cassandra`

### Issue: Cassandra warnings about vm.max_map_count

**On Linux host:**
```bash
sudo sysctl -w vm.max_map_count=1048575
```

**To make permanent, add to /etc/sysctl.conf:**
```
vm.max_map_count=1048575
```

### Issue: Services start before databases are ready

The retry logic should handle this, but if issues persist:

1. Increase retry count in code (change `max_retries = 5` to `max_retries = 10`)
2. Increase health check intervals in docker-compose.yml
3. Add startup delays:
   ```yaml
   back-postgres-service:
     restart: on-failure
     restart_policy:
       delay: 5s
   ```

## Additional Improvements Made

### 1. Better Error Messages
- Connection attempts now log which host/port they're connecting to
- Retry attempts are logged with attempt numbers
- Clear success/failure messages

### 2. Exponential Backoff
- Prevents overwhelming the database with connection attempts
- Gives databases more time to initialize on later attempts

### 3. Graceful Degradation
- Services will retry automatically without crashing immediately
- Proper error propagation if all retries fail

## Testing the Subscription Feature

Once the services are running successfully:

1. **Verify PostgreSQL tables were created:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db -c "\dt"
   ```

   Should show: `subscription_packages`, `user_subscriptions`, `subscription_history`

2. **Verify subscription packages were populated:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec postgresql psql -U user -d main_db -c "SELECT slug, name, price_monthly FROM subscription_packages ORDER BY display_order;"
   ```

   Should show: Free, Standard, Premium, Enterprise

3. **Verify Cassandra keyspace and tables:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec cassandra cqlsh -e "DESCRIBE KEYSPACE tools_dashboard;"
   ```

   Should show: `subscription_package_metadata`, `subscription_features`

4. **Test the API:**
   ```bash
   curl http://localhost:8100/user-subscription/packages
   ```

5. **Test the frontend:**
   - Navigate to `http://localhost/pricing`
   - Should see 4 subscription packages
   - Click "Continue" on any package to see the checkout form

## Summary

The connection issues were caused by incorrect hostname configuration. By:
1. Using Docker service names instead of `localhost`
2. Parsing the correct environment variables from docker-compose
3. Adding retry logic with exponential backoff

The services now connect reliably to their databases and properly initialize the subscription feature data.

## Files Modified

- `/mnt/d/Projects/EPIC/tools-dashboard/back-postgres/main.py`
- `/mnt/d/Projects/EPIC/tools-dashboard/back-cassandra/main.py`

## No Changes Needed

- docker-compose.dev.yml (already correctly configured)
- docker-compose.prod.yml (already correctly configured)
