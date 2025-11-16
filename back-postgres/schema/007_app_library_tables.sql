-- ============================================================================
-- App Library - PostgreSQL Schema
-- ============================================================================
-- Created: 2025-11-15
-- Purpose: Application library tables for app management, access control,
--          user preferences, and audit logging
-- ============================================================================

-- ============================================================================
-- Table 1: Extend OAuth Clients for App Library
-- ============================================================================
-- NOTE: oauth_clients table already exists from 006_oauth_tables.sql
--       We're adding app-library-specific columns to it
-- ============================================================================

-- Add dev_url, prod_url, and deleted_at columns if they don't exist
ALTER TABLE oauth_clients
    ADD COLUMN IF NOT EXISTS dev_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS prod_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add partial index for active apps
CREATE INDEX IF NOT EXISTS idx_oauth_clients_active_not_deleted
    ON oauth_clients(is_active) WHERE deleted_at IS NULL;

-- Add index for deleted_at
CREATE INDEX IF NOT EXISTS idx_oauth_clients_deleted_at
    ON oauth_clients(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments for new columns
COMMENT ON COLUMN oauth_clients.dev_url IS 'Development environment URL for app library';
COMMENT ON COLUMN oauth_clients.prod_url IS 'Production environment URL (optional)';
COMMENT ON COLUMN oauth_clients.deleted_at IS 'Soft delete timestamp for app library';

-- ============================================================================
-- Table 2: Access Control Rules
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,

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
    created_by INTEGER REFERENCES users(id),

    -- Constraints
    CONSTRAINT unique_app_access_rule UNIQUE(app_id),
    CONSTRAINT valid_access_mode CHECK(mode IN ('all_users', 'all_except', 'only_specified', 'subscription_based'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_rules_app_id ON app_access_rules(app_id);
CREATE INDEX IF NOT EXISTS idx_access_rules_mode ON app_access_rules(mode);

-- GIN index for user_ids array searches
CREATE INDEX IF NOT EXISTS idx_access_rules_user_ids ON app_access_rules USING GIN(user_ids);

-- Comments
COMMENT ON TABLE app_access_rules IS 'Access control rules for applications';
COMMENT ON COLUMN app_access_rules.mode IS 'Access control mode: all_users, all_except, only_specified, subscription_based';
COMMENT ON COLUMN app_access_rules.user_ids IS 'User IDs for all_except or only_specified modes';
COMMENT ON COLUMN app_access_rules.subscription_tiers IS 'Subscription tiers for subscription_based mode';

-- ============================================================================
-- Table 3: User App Preferences
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_app_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,

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
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_id ON user_app_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_app_client_id ON user_app_preferences(app_client_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_favorite ON user_app_preferences(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_prefs_last_launched ON user_app_preferences(last_launched_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_favorite ON user_app_preferences(user_id, is_favorite) WHERE is_favorite = true;

-- Comments
COMMENT ON TABLE user_app_preferences IS 'User preferences for applications (favorites, recently used)';
COMMENT ON COLUMN user_app_preferences.is_favorite IS 'Whether user has marked this app as favorite';
COMMENT ON COLUMN user_app_preferences.last_launched_at IS 'Timestamp of last launch';
COMMENT ON COLUMN user_app_preferences.launch_count IS 'Total number of times user has launched this app';

-- ============================================================================
-- Table 4: App Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES oauth_clients(id) ON DELETE SET NULL,

    -- Event details
    event_type VARCHAR(50) NOT NULL,
    -- Possible values: 'created', 'updated', 'deleted', 'activated', 'deactivated',
    --                  'secret_regenerated', 'access_modified', 'redirect_uri_added',
    --                  'redirect_uri_removed', 'scope_added', 'scope_removed'

    -- User who performed action
    performed_by INTEGER REFERENCES users(id),

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
CREATE INDEX IF NOT EXISTS idx_audit_app_id ON app_audit_log(app_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON app_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON app_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON app_audit_log(created_at DESC);

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_audit_changes ON app_audit_log USING GIN(changes);

-- Comments
COMMENT ON TABLE app_audit_log IS 'Audit trail for application management actions';
COMMENT ON COLUMN app_audit_log.event_type IS 'Type of event that occurred';
COMMENT ON COLUMN app_audit_log.changes IS 'JSON object containing field-level changes';
COMMENT ON COLUMN app_audit_log.snapshot IS 'Complete snapshot of app data (for delete events)';

-- ============================================================================
-- Triggers for Updated_at Timestamps
-- ============================================================================
-- NOTE: update_updated_at_column() function should already exist from previous migrations
--       oauth_clients already has its update trigger from 006_oauth_tables.sql
-- ============================================================================

-- Create function if it doesn't exist (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for app_access_rules table
DROP TRIGGER IF EXISTS update_access_rules_updated_at ON app_access_rules;
CREATE TRIGGER update_access_rules_updated_at
    BEFORE UPDATE ON app_access_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_app_preferences table
DROP TRIGGER IF EXISTS update_user_prefs_updated_at ON user_app_preferences;
CREATE TRIGGER update_user_prefs_updated_at
    BEFORE UPDATE ON user_app_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- End of Schema
-- ============================================================================
