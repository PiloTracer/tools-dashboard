-- ============================================================================
-- Rizervox app library bootstrap (idempotent)
-- ============================================================================
-- Runs with other schema/*.sql on every back-postgres init.
-- Dev client secret (same convention as E-Cards bootstrap): dev_secret_do_not_use_in_production
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
WHERE client_id = 'rizervox_r1z2r3v4'
ON CONFLICT (app_id) DO UPDATE SET
    mode = EXCLUDED.mode,
    created_by = COALESCE(app_access_rules.created_by, EXCLUDED.created_by),
    updated_at = NOW();
