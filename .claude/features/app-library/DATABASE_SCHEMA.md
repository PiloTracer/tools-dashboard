# App Library - Database Schema

**Feature:** Application Library with Auto-Authentication
**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** Planning Phase

---

## Overview

The app-library feature requires database schema across multiple data stores:
- **PostgreSQL:** Application registry, access control rules, user preferences
- **Cassandra:** App launch events, usage analytics (time-series data)
- **Redis:** Caching, rate limiting

---

## PostgreSQL Schema

### 1. Applications Table

**Purpose:** Store registered applications (OAuth clients)

```sql
-- File: back-postgres/schema/007_app_library.sql

-- Applications table (extends oauth_clients from auto-auth)
-- Note: This table may already exist from auto-auth feature
-- If so, just add the new columns with ALTER TABLE

CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- OAuth Client Info
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),

    -- URLs
    dev_url VARCHAR(500) NOT NULL,
    prod_url VARCHAR(500),
    redirect_uris TEXT[] NOT NULL,

    -- Configuration
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['profile', 'email'],
    is_active BOOLEAN DEFAULT false,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT unique_client_name UNIQUE(client_name),
    CONSTRAINT at_least_one_redirect_uri CHECK(array_length(redirect_uris, 1) > 0),
    CONSTRAINT at_least_one_scope CHECK(array_length(allowed_scopes, 1) > 0)
);

-- Indexes for performance
CREATE INDEX idx_apps_active ON apps(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_apps_created_by ON apps(created_by);
CREATE INDEX idx_apps_client_id ON apps(client_id);
CREATE INDEX idx_apps_created_at ON apps(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE apps IS 'Registered applications in the app library';
COMMENT ON COLUMN apps.client_id IS 'Unique OAuth client identifier (e.g., ecards_a1b2c3d4)';
COMMENT ON COLUMN apps.client_secret_hash IS 'Bcrypt hash of client secret (never stored in plain text)';
COMMENT ON COLUMN apps.dev_url IS 'Development environment URL';
COMMENT ON COLUMN apps.prod_url IS 'Production environment URL (optional)';
COMMENT ON COLUMN apps.redirect_uris IS 'Allowed OAuth redirect URIs';
COMMENT ON COLUMN apps.allowed_scopes IS 'OAuth scopes this app can request';
COMMENT ON COLUMN apps.is_active IS 'Whether app is currently active (visible in library)';
COMMENT ON COLUMN apps.deleted_at IS 'Soft delete timestamp';
```

### 2. Access Control Rules Table

**Purpose:** Define who can access each application

```sql
-- Access control rules table
CREATE TABLE IF NOT EXISTS app_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,

    -- Access Mode
    mode VARCHAR(50) NOT NULL DEFAULT 'all_users',
    -- Possible values: 'all_users', 'all_except', 'only_specified', 'subscription_based'

    -- User-specific access
    user_ids UUID[] DEFAULT ARRAY[]::UUID[],

    -- Subscription-based access
    subscription_tiers TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Possible values: 'free', 'pro', 'enterprise', 'custom'

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Constraints
    CONSTRAINT unique_app_access_rule UNIQUE(app_id),
    CONSTRAINT valid_access_mode CHECK(mode IN ('all_users', 'all_except', 'only_specified', 'subscription_based'))
);

-- Indexes
CREATE INDEX idx_access_rules_app_id ON app_access_rules(app_id);
CREATE INDEX idx_access_rules_mode ON app_access_rules(mode);

-- GIN index for user_ids array searches
CREATE INDEX idx_access_rules_user_ids ON app_access_rules USING GIN(user_ids);

-- Comments
COMMENT ON TABLE app_access_rules IS 'Access control rules for applications';
COMMENT ON COLUMN app_access_rules.mode IS 'Access control mode: all_users, all_except, only_specified, subscription_based';
COMMENT ON COLUMN app_access_rules.user_ids IS 'User IDs for all_except or only_specified modes';
COMMENT ON COLUMN app_access_rules.subscription_tiers IS 'Subscription tiers for subscription_based mode';
```

### 3. User App Preferences Table

**Purpose:** Store user favorites, recently used apps

```sql
-- User app preferences table
CREATE TABLE IF NOT EXISTS user_app_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_client_id VARCHAR(255) NOT NULL REFERENCES apps(client_id) ON DELETE CASCADE,

    -- Preferences
    is_favorite BOOLEAN DEFAULT false,
    last_launched_at TIMESTAMPTZ,
    launch_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_app_pref UNIQUE(user_id, app_client_id),
    CONSTRAINT launch_count_positive CHECK(launch_count >= 0)
);

-- Indexes
CREATE INDEX idx_user_prefs_user_id ON user_app_preferences(user_id);
CREATE INDEX idx_user_prefs_app_client_id ON user_app_preferences(app_client_id);
CREATE INDEX idx_user_prefs_favorite ON user_app_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_prefs_last_launched ON user_app_preferences(last_launched_at DESC);
CREATE INDEX idx_user_prefs_user_favorite ON user_app_preferences(user_id, is_favorite) WHERE is_favorite = true;

-- Comments
COMMENT ON TABLE user_app_preferences IS 'User preferences for applications (favorites, recently used)';
COMMENT ON COLUMN user_app_preferences.is_favorite IS 'Whether user has marked this app as favorite';
COMMENT ON COLUMN user_app_preferences.last_launched_at IS 'Timestamp of last launch';
COMMENT ON COLUMN user_app_preferences.launch_count IS 'Total number of times user has launched this app';
```

### 4. Audit Log Table (Optional - for compliance)

**Purpose:** Track all administrative actions on applications

```sql
-- App management audit log
CREATE TABLE IF NOT EXISTS app_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(50) NOT NULL,
    -- Possible values: 'created', 'updated', 'deleted', 'activated', 'deactivated', 'secret_regenerated', 'access_modified'

    -- User who performed action
    performed_by UUID REFERENCES users(id),

    -- Changes (JSON)
    changes JSONB,
    -- Example: {"field": "is_active", "old_value": false, "new_value": true}

    -- Snapshot (for delete events)
    snapshot JSONB,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,

    -- Constraints
    CONSTRAINT valid_event_type CHECK(event_type IN (
        'created', 'updated', 'deleted', 'activated', 'deactivated',
        'secret_regenerated', 'access_modified', 'redirect_uri_added',
        'redirect_uri_removed', 'scope_added', 'scope_removed'
    ))
);

-- Indexes
CREATE INDEX idx_audit_app_id ON app_audit_log(app_id);
CREATE INDEX idx_audit_performed_by ON app_audit_log(performed_by);
CREATE INDEX idx_audit_event_type ON app_audit_log(event_type);
CREATE INDEX idx_audit_created_at ON app_audit_log(created_at DESC);

-- GIN index for JSONB searches
CREATE INDEX idx_audit_changes ON app_audit_log USING GIN(changes);

-- Comments
COMMENT ON TABLE app_audit_log IS 'Audit trail for application management actions';
COMMENT ON COLUMN app_audit_log.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN app_audit_log.changes IS 'JSON object containing field-level changes';
COMMENT ON COLUMN app_audit_log.snapshot IS 'Complete snapshot of app data (for delete events)';
```

### 5. Update Triggers

**Purpose:** Automatically update `updated_at` timestamps

```sql
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for apps table
CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for app_access_rules table
CREATE TRIGGER update_access_rules_updated_at
    BEFORE UPDATE ON app_access_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_app_preferences table
CREATE TRIGGER update_user_prefs_updated_at
    BEFORE UPDATE ON user_app_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## Cassandra Schema

### 1. App Launch Events Table

**Purpose:** Track every app launch for analytics

```cql
-- File: back-cassandra/schema/005_app_library.cql

-- App launch events (time-series data)
CREATE TABLE IF NOT EXISTS auth_events.app_launch_events (
    app_client_id TEXT,
    launch_date DATE,
    launch_timestamp TIMESTAMP,
    user_id UUID,

    -- Launch details
    redirect_uri TEXT,
    scopes SET<TEXT>,
    authorization_code TEXT,

    -- OAuth flow outcome
    success BOOLEAN,
    error_code TEXT,
    error_description TEXT,

    -- Metadata
    ip_address INET,
    user_agent TEXT,

    PRIMARY KEY ((app_client_id, launch_date), launch_timestamp, user_id)
) WITH CLUSTERING ORDER BY (launch_timestamp DESC, user_id ASC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy',
                    'compaction_window_size': 1,
                    'compaction_window_unit': 'DAYS'}
  AND default_time_to_live = 7776000; -- 90 days

-- Comments
COMMENT ON TABLE auth_events.app_launch_events IS 'Time-series log of application launches';

-- Secondary indexes
CREATE INDEX IF NOT EXISTS ON auth_events.app_launch_events (user_id);
CREATE INDEX IF NOT EXISTS ON auth_events.app_launch_events (success);
```

### 2. App Usage Aggregations Table

**Purpose:** Pre-aggregated daily statistics for performance

```cql
-- Daily app usage statistics (aggregated for performance)
CREATE TABLE IF NOT EXISTS auth_events.app_daily_stats (
    app_client_id TEXT,
    stat_date DATE,

    -- Metrics
    total_launches INT,
    unique_users SET<UUID>,
    successful_launches INT,
    failed_launches INT,

    -- Aggregated at
    computed_at TIMESTAMP,

    PRIMARY KEY (app_client_id, stat_date)
) WITH CLUSTERING ORDER BY (stat_date DESC)
  AND default_time_to_live = 63072000; -- 2 years

-- Comments
COMMENT ON TABLE auth_events.app_daily_stats IS 'Pre-aggregated daily statistics per application';
```

### 3. User App Activity Table

**Purpose:** Track individual user activity per app

```cql
-- User activity per app (for recently used tracking)
CREATE TABLE IF NOT EXISTS auth_events.user_app_activity (
    user_id UUID,
    app_client_id TEXT,

    -- Activity
    last_launch_timestamp TIMESTAMP,
    total_launches COUNTER,

    PRIMARY KEY (user_id, app_client_id)
);

-- Comments
COMMENT ON TABLE auth_events.user_app_activity IS 'User activity tracking per application';

-- Secondary index
CREATE INDEX IF NOT EXISTS ON auth_events.user_app_activity (app_client_id);
```

---

## Redis Schema

### 1. Caching Keys

**Purpose:** Cache frequently accessed data

```
# Key Patterns and TTLs

# App list cache (5 minutes)
app:list:{user_id}
  Value: JSON array of apps
  TTL: 300 seconds

# App details cache (1 hour)
app:details:{app_id}
  Value: JSON object
  TTL: 3600 seconds

# Access check cache (5 minutes)
app:access:{user_id}:{app_id}
  Value: "allowed" | "denied"
  TTL: 300 seconds

# User favorites cache (5 minutes)
app:favorites:{user_id}
  Value: Set of app_client_ids
  TTL: 300 seconds

# User recent apps cache (5 minutes)
app:recent:{user_id}
  Value: Sorted set (score = timestamp)
  TTL: 300 seconds
```

### 2. Rate Limiting Keys

**Purpose:** Rate limit admin operations and API calls

```
# Admin API rate limiting (100 req/min)
ratelimit:admin:{user_id}:{minute}
  Value: Request count
  TTL: 60 seconds

# App library API rate limiting (1000 req/min per user)
ratelimit:library:{user_id}:{minute}
  Value: Request count
  TTL: 60 seconds

# OAuth client creation rate limiting (5 per hour)
ratelimit:create_app:{user_id}:{hour}
  Value: Creation count
  TTL: 3600 seconds
```

### 3. Session Keys

**Purpose:** Store temporary data during app launch

```
# OAuth state storage (during launch flow)
oauth:launch:{state}
  Value: JSON object {app_id, user_id, redirect_uri, scopes, timestamp}
  TTL: 600 seconds (10 minutes)
```

---

## Data Migration Scripts

### Initial Migration

```sql
-- File: back-postgres/migrations/007_create_app_library_tables.sql

BEGIN;

-- Create all tables
\i 007_app_library.sql

-- Create initial access rules (all apps default to all_users)
INSERT INTO app_access_rules (app_id, mode, created_at)
SELECT id, 'all_users', NOW()
FROM apps
WHERE NOT EXISTS (
    SELECT 1 FROM app_access_rules WHERE app_access_rules.app_id = apps.id
);

COMMIT;
```

### Rollback Script

```sql
-- File: back-postgres/migrations/007_rollback_app_library_tables.sql

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;
DROP TRIGGER IF EXISTS update_access_rules_updated_at ON app_access_rules;
DROP TRIGGER IF EXISTS update_user_prefs_updated_at ON user_app_preferences;

-- Drop tables (in reverse order of dependencies)
DROP TABLE IF EXISTS app_audit_log;
DROP TABLE IF EXISTS user_app_preferences;
DROP TABLE IF EXISTS app_access_rules;
DROP TABLE IF EXISTS apps;

COMMIT;
```

---

## Seed Data

### Development Seed Data

```sql
-- File: back-postgres/seeds/dev/007_app_library_seed.sql

-- Seed E-Cards application
INSERT INTO apps (
    client_id,
    client_secret_hash,
    client_name,
    description,
    logo_url,
    dev_url,
    prod_url,
    redirect_uris,
    allowed_scopes,
    is_active,
    created_by
) VALUES (
    'ecards_a1b2c3d4',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Wgn7qm', -- bcrypt hash of 'dev_secret'
    'E-Card + QR-Code Batch Generator',
    'Create stunning personalized cards with dynamic QR codes, customizable templates, and intelligent name parsing. From design to deployment in minutes.',
    'https://cdn.example.com/logos/ecards.png',
    'http://localhost:7300',
    'https://ecards.epicstudio.com',
    ARRAY[
        'http://localhost:7300/oauth/complete',
        'https://ecards.epicstudio.com/oauth/complete'
    ],
    ARRAY['profile', 'email', 'subscription'],
    true,
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
)
ON CONFLICT (client_id) DO NOTHING;

-- Create default access rule (all users)
INSERT INTO app_access_rules (app_id, mode)
SELECT id, 'all_users'
FROM apps
WHERE client_id = 'ecards_a1b2c3d4'
ON CONFLICT (app_id) DO NOTHING;
```

---

## Query Examples

### 1. Get All Active Apps for User

```sql
-- Get apps user has access to
SELECT a.*
FROM apps a
LEFT JOIN app_access_rules aar ON a.id = aar.app_id
WHERE a.is_active = true
  AND a.deleted_at IS NULL
  AND (
    -- No access rule (default: all users)
    aar.id IS NULL
    OR
    -- All users mode
    aar.mode = 'all_users'
    OR
    -- All except mode (user not in exclusion list)
    (aar.mode = 'all_except' AND NOT (:user_id = ANY(aar.user_ids)))
    OR
    -- Only specified mode (user in inclusion list)
    (aar.mode = 'only_specified' AND :user_id = ANY(aar.user_ids))
    OR
    -- Subscription-based mode (user has required tier)
    (aar.mode = 'subscription_based' AND EXISTS (
        SELECT 1 FROM user_subscriptions us
        WHERE us.user_id = :user_id
          AND us.tier = ANY(aar.subscription_tiers)
          AND us.status = 'active'
    ))
  )
ORDER BY a.client_name;
```

### 2. Get User's Favorite Apps

```sql
-- Get favorite apps with app details
SELECT a.*, uap.last_launched_at, uap.launch_count
FROM user_app_preferences uap
JOIN apps a ON uap.app_client_id = a.client_id
WHERE uap.user_id = :user_id
  AND uap.is_favorite = true
  AND a.is_active = true
  AND a.deleted_at IS NULL
ORDER BY a.client_name;
```

### 3. Get User's Recently Used Apps

```sql
-- Get recently used apps (last 5, within 30 days)
SELECT a.*, uap.last_launched_at, uap.launch_count
FROM user_app_preferences uap
JOIN apps a ON uap.app_client_id = a.client_id
WHERE uap.user_id = :user_id
  AND uap.last_launched_at > NOW() - INTERVAL '30 days'
  AND a.is_active = true
  AND a.deleted_at IS NULL
ORDER BY uap.last_launched_at DESC
LIMIT 5;
```

### 4. Get App Usage Statistics (PostgreSQL + Cassandra)

```sql
-- Get basic stats from PostgreSQL
SELECT
    a.id,
    a.client_name,
    COUNT(DISTINCT uap.user_id) as total_users,
    SUM(uap.launch_count) as total_launches
FROM apps a
LEFT JOIN user_app_preferences uap ON a.client_id = uap.app_client_id
WHERE a.id = :app_id
GROUP BY a.id, a.client_name;
```

```cql
-- Get daily stats from Cassandra
SELECT stat_date, total_launches, cardinality(unique_users) as unique_users
FROM auth_events.app_daily_stats
WHERE app_client_id = 'ecards_a1b2c3d4'
  AND stat_date >= '2025-10-15'
  AND stat_date <= '2025-11-15'
ORDER BY stat_date DESC;
```

### 5. Audit Trail Query

```sql
-- Get all changes to an app
SELECT
    aal.*,
    u.email as performed_by_email,
    u.full_name as performed_by_name
FROM app_audit_log aal
LEFT JOIN users u ON aal.performed_by = u.id
WHERE aal.app_id = :app_id
ORDER BY aal.created_at DESC
LIMIT 50;
```

---

## Database Maintenance

### Regular Maintenance Tasks

**Daily:**
- Aggregate Cassandra launch events into daily stats
- Clean up expired Redis keys (automatic)

**Weekly:**
- Vacuum PostgreSQL tables
- Analyze query performance
- Review slow query log

**Monthly:**
- Archive old audit logs (> 1 year)
- Review and optimize indexes
- Backup seed data

### Cleanup Scripts

```sql
-- Archive old audit logs (move to archive table)
BEGIN;

INSERT INTO app_audit_log_archive
SELECT * FROM app_audit_log
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM app_audit_log
WHERE created_at < NOW() - INTERVAL '1 year';

COMMIT;
```

```cql
-- Cassandra auto-deletes based on TTL (no manual cleanup needed)
-- But you can manually delete if needed:

DELETE FROM auth_events.app_launch_events
WHERE app_client_id = 'ecards_a1b2c3d4'
  AND launch_date < '2024-01-01';
```

---

## Performance Benchmarks

### Expected Performance

**PostgreSQL:**
- `SELECT` apps for user: < 10ms (with indexes)
- `INSERT` new app: < 20ms
- `UPDATE` app: < 15ms
- Access control check: < 5ms (with cache)

**Cassandra:**
- Insert launch event: < 5ms
- Query daily stats (30 days): < 20ms
- Aggregate monthly stats: < 100ms

**Redis:**
- Cache hit: < 1ms
- Cache miss + DB query: < 15ms

---

## Backup Strategy

### PostgreSQL Backups

- **Frequency:** Daily (full), Hourly (incremental)
- **Retention:** 30 days
- **Critical Tables:**
  - `apps` (application registry)
  - `app_access_rules` (access control)
  - `app_audit_log` (compliance)

### Cassandra Backups

- **Frequency:** Weekly (snapshot)
- **Retention:** 90 days
- **Tables:**
  - `app_launch_events`
  - `app_daily_stats`

### Disaster Recovery

- **RTO:** 1 hour
- **RPO:** 1 hour
- **Recovery Steps:**
  1. Restore PostgreSQL from latest backup
  2. Restore Cassandra snapshots
  3. Rebuild Redis cache (from PostgreSQL)
  4. Verify data integrity
  5. Resume traffic

---

**Document Owner:** Database Team
**Last Reviewed:** 2025-11-15
**Next Review:** 2025-12-15
