-- ============================================================================
-- E-Cards app library bootstrap (idempotent)
-- ============================================================================
-- Runs with other schema/*.sql on every back-postgres init.
-- Replaces manual execution of seeds/dev/007_app_library_seed.sql for the core
-- oauth client + access rule. Client secret (dev only): dev_secret_do_not_use_in_production
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
    'ecards_a1b2c3d4',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIr.Wgn7qm',
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
ON CONFLICT (client_id) DO UPDATE SET
    client_name = EXCLUDED.client_name,
    description = EXCLUDED.description,
    logo_url = EXCLUDED.logo_url,
    dev_url = EXCLUDED.dev_url,
    prod_url = EXCLUDED.prod_url,
    redirect_uris = EXCLUDED.redirect_uris,
    allowed_scopes = EXCLUDED.allowed_scopes,
    is_active = EXCLUDED.is_active,
    created_by = COALESCE(oauth_clients.created_by, EXCLUDED.created_by),
    updated_at = NOW();

INSERT INTO app_access_rules (app_id, mode, created_by)
SELECT
    id,
    'all_users',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
FROM oauth_clients
WHERE client_id = 'ecards_a1b2c3d4'
ON CONFLICT (app_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    created_by = COALESCE(app_access_rules.created_by, EXCLUDED.created_by),
    updated_at = NOW();

DELETE FROM oauth_clients WHERE client_id = 'ecards_app_dev';
