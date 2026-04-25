-- ============================================================================
-- Rizervox app library bootstrap (insert-only)
-- ============================================================================
-- Runs with other schema/*.sql on every back-postgres-service start.
-- Inserts default rows only if missing (`ON CONFLICT DO NOTHING`). Does not overwrite admin edits.
-- Canonical Rizervox OAuth definition (duplicate `seeds/dev/008_cms_app_seed.sql` removed).
-- Dev client secret: dev_secret_do_not_use_in_production (same bcrypt hash as E-Cards in 008).
-- ============================================================================

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
    'rizervox_r1z2r3v4',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Wgn7qm',
    'Rizervox',
    'CMS + SEO + agentic',
    '/app/app-library-logos/rizervox.svg',
    'http://localhost:17513',
    'https://rizervox.com',
    ARRAY[
        'http://localhost:17513/oauth/complete',
        'https://rizervox.com/oauth/complete'
    ],
    ARRAY['profile', 'email', 'subscription'],
    true,
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
)
ON CONFLICT (client_id) DO NOTHING;

INSERT INTO app_access_rules (app_id, mode, created_by)
SELECT
    id,
    'all_users',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
FROM oauth_clients
WHERE client_id = 'rizervox_r1z2r3v4'
ON CONFLICT (app_id) DO NOTHING;

-- Optional dev sample preference (insert-only; does not overwrite favorites/launch stats)
INSERT INTO user_app_preferences (user_id, app_client_id, is_favorite, last_launched_at, launch_count)
SELECT
    id,
    'rizervox_r1z2r3v4',
    true,
    NOW() - INTERVAL '2 days',
    5
FROM users
WHERE email = 'admin@example.com'
ON CONFLICT (user_id, app_client_id) DO NOTHING;
