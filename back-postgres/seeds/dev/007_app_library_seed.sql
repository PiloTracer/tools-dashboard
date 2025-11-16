-- ============================================================================
-- App Library - Seed Data (Development)
-- ============================================================================
-- File: back-postgres/seeds/dev/007_app_library_seed.sql
-- Created: 2025-11-15
-- Purpose: Seed E-Cards application for development/testing
-- ============================================================================

-- ============================================================================
-- Seed E-Cards Application
-- ============================================================================
-- Note: Using oauth_clients table (not apps, as we reused the existing table)
-- Client Secret: 'dev_secret_do_not_use_in_production'
-- Hash generated with: bcrypt.hashpw(b'dev_secret_do_not_use_in_production', bcrypt.gensalt(12))

INSERT INTO oauth_clients (
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
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Wgn7qm',  -- bcrypt hash of 'dev_secret_do_not_use_in_production'
    'E-Card + QR-Code Batch Generator',
    'Create stunning personalized cards with dynamic QR codes, customizable templates, and intelligent name parsing. From design to deployment in minutes.',
    'https://cdn.example.com/logos/ecards.png',
    'http://localhost:7300',
    'https://ecards.epicstudio.com',
    ARRAY[
        'http://localhost:7300/auth/callback',
        'https://ecards.epicstudio.com/auth/callback'
    ],
    ARRAY['profile', 'email', 'subscription'],
    true,
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
)
ON CONFLICT (client_id) DO UPDATE SET
    client_name = EXCLUDED.client_name,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    dev_url = EXCLUDED.dev_url,
    prod_url = EXCLUDED.prod_url,
    redirect_uris = EXCLUDED.redirect_uris,
    allowed_scopes = EXCLUDED.allowed_scopes,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- Create Default Access Rule (All Users)
-- ============================================================================
-- This allows all users to access the E-Cards application

INSERT INTO app_access_rules (app_id, mode, created_by)
SELECT
    id,
    'all_users',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
FROM oauth_clients
WHERE client_id = 'ecards_a1b2c3d4'
ON CONFLICT (app_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    updated_at = NOW();

-- ============================================================================
-- Seed Sample User Preferences (for testing)
-- ============================================================================
-- Create sample preferences for the admin user

INSERT INTO user_app_preferences (user_id, app_client_id, is_favorite, last_launched_at, launch_count)
SELECT
    id,
    'ecards_a1b2c3d4',
    true,  -- Mark as favorite
    NOW() - INTERVAL '2 days',  -- Launched 2 days ago
    5  -- Launched 5 times
FROM users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, app_client_id) DO UPDATE SET
    is_favorite = EXCLUDED.is_favorite,
    last_launched_at = EXCLUDED.last_launched_at,
    launch_count = EXCLUDED.launch_count,
    updated_at = NOW();

-- ============================================================================
-- Seed Cassandra Data (Sample Launch Events)
-- ============================================================================
-- Note: Cassandra seed data should be inserted via CQL or application code
-- This is documented here for reference

-- Sample CQL commands:
-- INSERT INTO auth_events.app_launch_events (
--     app_client_id, launch_date, launch_timestamp, user_id,
--     redirect_uri, scopes, success, ip_address, user_agent
-- ) VALUES (
--     'ecards_a1b2c3d4', '2025-11-15', toTimestamp(now()), uuid(),
--     'http://localhost:7300/auth/callback', {'profile', 'email', 'subscription'},
--     true, '127.0.0.1', 'Mozilla/5.0 (Test Browser)'
-- );

-- INSERT INTO auth_events.app_daily_stats (
--     app_client_id, stat_date, total_launches, unique_users,
--     successful_launches, failed_launches, computed_at
-- ) VALUES (
--     'ecards_a1b2c3d4', '2025-11-15', 10, {uuid(), uuid(), uuid()},
--     9, 1, toTimestamp(now())
-- );

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify E-Cards application was created
DO $$
DECLARE
    app_count INTEGER;
    rule_count INTEGER;
    pref_count INTEGER;
BEGIN
    -- Check app
    SELECT COUNT(*) INTO app_count FROM oauth_clients WHERE client_id = 'ecards_a1b2c3d4';
    IF app_count > 0 THEN
        RAISE NOTICE '✅ E-Cards application created successfully';
    ELSE
        RAISE WARNING '❌ E-Cards application NOT created';
    END IF;

    -- Check access rule
    SELECT COUNT(*) INTO rule_count
    FROM app_access_rules aar
    JOIN oauth_clients oc ON aar.app_id = oc.id
    WHERE oc.client_id = 'ecards_a1b2c3d4';
    IF rule_count > 0 THEN
        RAISE NOTICE '✅ Access rule created successfully';
    ELSE
        RAISE WARNING '❌ Access rule NOT created';
    END IF;

    -- Check user preferences
    SELECT COUNT(*) INTO pref_count FROM user_app_preferences WHERE app_client_id = 'ecards_a1b2c3d4';
    IF pref_count > 0 THEN
        RAISE NOTICE '✅ User preferences created successfully';
    ELSE
        RAISE NOTICE 'ℹ️  No user preferences created (users table may be empty)';
    END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Seeded:
-- 1. E-Cards application (oauth_clients)
-- 2. Default access rule (all_users mode)
-- 3. Sample user preference for admin user
--
-- Client Credentials (Development Only):
-- - Client ID: ecards_a1b2c3d4
-- - Client Secret: dev_secret_do_not_use_in_production
--
-- WARNING: DO NOT USE THESE CREDENTIALS IN PRODUCTION!
-- ============================================================================
