-- E-Cards Application - Seed Data
-- File: back-postgres/seeds/dev/007_app_library_seed.sql
-- Purpose: Populate initial E-Cards application for app-library feature
--
-- This seed data is based on the E-Cards application screenshot:
-- - App Name: E-Card + QR-Code Batch Generator
-- - Tagline: Transform your workflow with professional batch card generation
-- - Description: Create stunning personalized cards with dynamic QR codes,
--   customizable templates, and intelligent name parsing.
-- - Dev URL: http://localhost:7300/
-- - Prod URL: https://ecards.epicstudio.com
--
-- Generated: 2025-11-15

BEGIN;

-- ============================================================================
-- INSERT E-CARDS APPLICATION
-- ============================================================================

INSERT INTO apps (
    id,
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
    created_at,
    updated_at,
    created_by
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'ecards_a1b2c3d4',
    -- Hash of 'dev_secret_ecards_2025' (bcrypt cost 12)
    -- Use this for development only. In production, generate a secure secret.
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Wgn7qm',
    'E-Card + QR-Code Batch Generator',
    'Transform your workflow with professional batch card generation. Create stunning personalized cards with dynamic QR codes, customizable templates, and intelligent name parsing. From design to deployment in minutes.',
    'https://cdn.example.com/logos/ecards.png', -- TODO: Replace with actual logo URL
    'http://localhost:7300',
    'https://ecards.epicstudio.com',
    ARRAY[
        'http://localhost:7300/auth/callback',
        'http://localhost:7300/callback',
        'https://ecards.epicstudio.com/auth/callback',
        'https://ecards.epicstudio.com/callback'
    ],
    ARRAY['profile', 'email', 'subscription'],
    true, -- Active by default
    NOW(),
    NOW(),
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
)
ON CONFLICT (client_id) DO UPDATE
SET
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
-- INSERT DEFAULT ACCESS RULE (ALL USERS)
-- ============================================================================

INSERT INTO app_access_rules (
    id,
    app_id,
    mode,
    user_ids,
    subscription_tiers,
    created_at,
    updated_at,
    created_by
) VALUES (
    '770e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'all_users',
    ARRAY[]::uuid[],
    ARRAY[]::text[],
    NOW(),
    NOW(),
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
)
ON CONFLICT (app_id) DO UPDATE
SET
    mode = EXCLUDED.mode,
    user_ids = EXCLUDED.user_ids,
    subscription_tiers = EXCLUDED.subscription_tiers,
    updated_at = NOW();

-- ============================================================================
-- INSERT SAMPLE USER PREFERENCES (FOR TESTING)
-- ============================================================================

-- Make E-Cards a favorite for the admin user
INSERT INTO user_app_preferences (
    id,
    user_id,
    app_client_id,
    is_favorite,
    last_launched_at,
    launch_count,
    created_at,
    updated_at
) VALUES (
    '880e8400-e29b-41d4-a716-446655440000'::uuid,
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
    'ecards_a1b2c3d4',
    true,
    NOW() - INTERVAL '2 hours',
    5,
    NOW() - INTERVAL '7 days',
    NOW()
)
ON CONFLICT (user_id, app_client_id) DO UPDATE
SET
    is_favorite = EXCLUDED.is_favorite,
    last_launched_at = EXCLUDED.last_launched_at,
    launch_count = user_app_preferences.launch_count + 1,
    updated_at = NOW();

-- ============================================================================
-- INSERT AUDIT LOG ENTRY
-- ============================================================================

INSERT INTO app_audit_log (
    id,
    app_id,
    event_type,
    performed_by,
    changes,
    snapshot,
    created_at,
    ip_address,
    user_agent
) VALUES (
    '990e8400-e29b-41d4-a716-446655440000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'created',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1),
    jsonb_build_object(
        'event', 'Initial seed data creation',
        'source', 'seed script',
        'version', '1.0.0'
    ),
    jsonb_build_object(
        'client_id', 'ecards_a1b2c3d4',
        'client_name', 'E-Card + QR-Code Batch Generator',
        'is_active', true,
        'allowed_scopes', ARRAY['profile', 'email', 'subscription']
    ),
    NOW(),
    '127.0.0.1'::inet,
    'Seed Script v1.0'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify app was created
SELECT
    id,
    client_id,
    client_name,
    is_active,
    created_at
FROM apps
WHERE client_id = 'ecards_a1b2c3d4';

-- Verify access rule was created
SELECT
    id,
    app_id,
    mode,
    created_at
FROM app_access_rules
WHERE app_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- Verify user preference was created
SELECT
    user_id,
    app_client_id,
    is_favorite,
    launch_count
FROM user_app_preferences
WHERE app_client_id = 'ecards_a1b2c3d4';

-- ============================================================================
-- NOTES
-- ============================================================================

-- Client Secret (for development only):
-- Plain text: dev_secret_ecards_2025
-- Bcrypt hash: $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Wgn7qm
--
-- IMPORTANT: In production, generate a cryptographically secure client_secret
-- using: openssl rand -base64 64
-- Then hash it using bcrypt with cost factor 12
--
-- Example (Python):
-- import bcrypt
-- secret = 'your_secure_secret_here'
-- hashed = bcrypt.hashpw(secret.encode('utf-8'), bcrypt.gensalt(12))
-- print(hashed.decode('utf-8'))

-- ============================================================================
-- CASSANDRA SEED DATA (Run separately in cqlsh)
-- ============================================================================

-- Note: The following CQL statements should be run in Cassandra cqlsh
-- File: back-cassandra/seeds/dev/005_app_library_seed.cql

/*
-- Insert sample launch event
INSERT INTO auth_events.app_launch_events (
    app_client_id,
    launch_date,
    launch_timestamp,
    user_id,
    redirect_uri,
    scopes,
    authorization_code,
    success,
    error_code,
    error_description,
    ip_address,
    user_agent
) VALUES (
    'ecards_a1b2c3d4',
    '2025-11-15',
    toTimestamp(now()),
    550e8400-e29b-41d4-a716-446655440001,
    'http://localhost:7300/auth/callback',
    {'profile', 'email', 'subscription'},
    'auth_code_sample_12345',
    true,
    null,
    null,
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
);

-- Insert sample daily stats
INSERT INTO auth_events.app_daily_stats (
    app_client_id,
    stat_date,
    total_launches,
    unique_users,
    successful_launches,
    failed_launches,
    computed_at
) VALUES (
    'ecards_a1b2c3d4',
    '2025-11-15',
    5,
    {550e8400-e29b-41d4-a716-446655440001},
    5,
    0,
    toTimestamp(now())
);

-- Insert sample user activity
UPDATE auth_events.user_app_activity
SET total_launches = total_launches + 5
WHERE user_id = 550e8400-e29b-41d4-a716-446655440001
  AND app_client_id = 'ecards_a1b2c3d4';

INSERT INTO auth_events.user_app_activity (
    user_id,
    app_client_id,
    last_launch_timestamp
) VALUES (
    550e8400-e29b-41d4-a716-446655440001,
    'ecards_a1b2c3d4',
    toTimestamp(now())
) IF NOT EXISTS;
*/

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

/*
BEGIN;

DELETE FROM app_audit_log WHERE app_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
DELETE FROM user_app_preferences WHERE app_client_id = 'ecards_a1b2c3d4';
DELETE FROM app_access_rules WHERE app_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
DELETE FROM apps WHERE client_id = 'ecards_a1b2c3d4';

COMMIT;
*/

-- ============================================================================
-- END OF FILE
-- ============================================================================
