-- ============================================================================
-- App Library - Rollback Script
-- ============================================================================
-- Created: 2025-11-15
-- Purpose: Rollback script to safely remove all app library tables
-- WARNING: This will permanently delete all application library data!
-- ============================================================================

BEGIN;

-- ============================================================================
-- Drop Triggers
-- ============================================================================

DROP TRIGGER IF EXISTS update_access_rules_updated_at ON app_access_rules;
DROP TRIGGER IF EXISTS update_user_prefs_updated_at ON user_app_preferences;

-- NOTE: Do NOT drop update_updated_at_column() function as other tables may use it
-- NOTE: Do NOT drop oauth_clients triggers - they belong to the auto-auth feature

-- ============================================================================
-- Drop Tables (in reverse order of dependencies)
-- ============================================================================

-- Drop audit log first (no dependencies)
DROP TABLE IF EXISTS app_audit_log;

-- Drop user preferences (depends on oauth_clients via client_id)
DROP TABLE IF EXISTS user_app_preferences;

-- Drop access rules (depends on oauth_clients via app_id)
DROP TABLE IF EXISTS app_access_rules;

-- ============================================================================
-- Remove App Library Columns from OAuth Clients
-- ============================================================================
-- NOTE: Do NOT drop oauth_clients table - it belongs to auto-auth feature
--       We only remove the columns we added for app-library

ALTER TABLE oauth_clients
    DROP COLUMN IF EXISTS dev_url,
    DROP COLUMN IF EXISTS prod_url,
    DROP COLUMN IF EXISTS deleted_at;

-- Drop indexes we created
DROP INDEX IF EXISTS idx_oauth_clients_active_not_deleted;
DROP INDEX IF EXISTS idx_oauth_clients_deleted_at;

COMMIT;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
-- All app library tables have been removed.
-- To restore, run: 007_app_library_tables.sql
-- ============================================================================
