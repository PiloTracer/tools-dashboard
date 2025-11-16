-- ============================================================================
-- App Library - Cassandra Schema
-- ============================================================================
-- Created: 2025-11-15
-- Purpose: Time-series data for app launches, usage analytics, and user activity
-- Keyspace: auth_events (should already exist from 004_oauth_auth_events.cql)
-- ============================================================================

-- ============================================================================
-- Table 1: App Launch Events (Time-Series)
-- ============================================================================
-- Purpose: Track every application launch for detailed analytics
-- Retention: 90 days (auto-deleted via TTL)
-- Partition Key: (app_client_id, launch_date) for efficient time-range queries
-- Clustering: launch_timestamp DESC, user_id ASC
-- ============================================================================

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
  AND compaction = {
      'class': 'TimeWindowCompactionStrategy',
      'compaction_window_size': 1,
      'compaction_window_unit': 'DAYS'
  }
  AND default_time_to_live = 7776000  -- 90 days (90 * 24 * 60 * 60)
  AND comment = 'Time-series log of application launches with 90-day TTL';

-- Secondary indexes for flexible querying
CREATE INDEX IF NOT EXISTS idx_app_launch_events_user_id
    ON auth_events.app_launch_events (user_id);

CREATE INDEX IF NOT EXISTS idx_app_launch_events_success
    ON auth_events.app_launch_events (success);

-- ============================================================================
-- Table 2: App Daily Stats (Pre-Aggregated)
-- ============================================================================
-- Purpose: Pre-aggregated daily statistics for fast analytics queries
-- Retention: 2 years (730 days)
-- Partition Key: app_client_id (one partition per app)
-- Clustering: stat_date DESC (most recent first)
-- ============================================================================

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
  AND default_time_to_live = 63072000  -- 2 years (730 * 24 * 60 * 60)
  AND comment = 'Pre-aggregated daily statistics per application (2-year retention)';

-- ============================================================================
-- Table 3: User App Activity (Per User)
-- ============================================================================
-- Purpose: Track individual user activity per app for "recently used" feature
-- Retention: No TTL (permanent user preference data)
-- Partition Key: user_id (one partition per user)
-- Clustering: app_client_id ASC
-- Note: This complements user_app_preferences in PostgreSQL (authoritative source)
--       Used for fast Cassandra-based queries when needed
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_events.user_app_activity (
    user_id UUID,
    app_client_id TEXT,

    -- Activity
    last_launch_timestamp TIMESTAMP,
    total_launches INT,

    PRIMARY KEY (user_id, app_client_id)
) WITH comment = 'User activity tracking per application (no TTL)';

-- Secondary index for reverse lookups (find users of an app)
CREATE INDEX IF NOT EXISTS idx_user_app_activity_app_client_id
    ON auth_events.user_app_activity (app_client_id);

-- ============================================================================
-- Usage Notes
-- ============================================================================
--
-- 1. Recording a Launch Event:
--    INSERT INTO auth_events.app_launch_events (
--        app_client_id, launch_date, launch_timestamp, user_id,
--        redirect_uri, scopes, success, ip_address, user_agent
--    ) VALUES (
--        'ecards_app', '2025-11-15', toTimestamp(now()), uuid(),
--        'http://localhost:7300/auth/callback', {'profile', 'email'},
--        true, '192.168.1.1', 'Mozilla/5.0...'
--    );
--
-- 2. Updating User Activity (using INSERT/UPDATE):
--    INSERT INTO auth_events.user_app_activity (
--        user_id, app_client_id, last_launch_timestamp, total_launches
--    ) VALUES (?, ?, toTimestamp(now()), 1);
--
-- 3. Querying Daily Stats (last 30 days):
--    SELECT * FROM auth_events.app_daily_stats
--    WHERE app_client_id = 'ecards_app'
--      AND stat_date >= '2025-10-16'
--      AND stat_date <= '2025-11-15';
--
-- 4. Finding Recently Used Apps:
--    SELECT app_client_id, last_launch_timestamp
--    FROM auth_events.user_app_activity
--    WHERE user_id = ?
--    ORDER BY last_launch_timestamp DESC
--    LIMIT 5;
--
-- ============================================================================
-- Maintenance
-- ============================================================================
--
-- Daily Aggregation Job (should run via back-workers):
-- 1. Query app_launch_events for yesterday
-- 2. Calculate stats (total, unique users, success/fail counts)
-- 3. INSERT/UPDATE into app_daily_stats
--
-- TTL Cleanup:
-- - app_launch_events: Auto-deleted after 90 days
-- - app_daily_stats: Auto-deleted after 2 years
-- - user_app_activity: No TTL (permanent)
--
-- ============================================================================
-- End of Schema
-- ============================================================================
