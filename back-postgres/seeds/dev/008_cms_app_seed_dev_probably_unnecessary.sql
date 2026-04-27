-- Rizervox CMS — optional manual seed (dev)
-- File: back-postgres/seeds/dev/008_cms_app_seed_dev.sql
--
-- back-postgres/main.py runs only schema/*.sql on each start. Canonical Rizervox bootstrap is
-- schema/009_rizervox_app_bootstrap.sql (insert-only ON CONFLICT DO NOTHING). This file is NOT auto-run.
--
-- Run manually (psql / compose exec) only when you need ON CONFLICT DO UPDATE: richer metadata and/or a
-- client_secret_hash that matches tools-cms OAUTH_CLIENT_SECRET. If that secret differs from
-- dev_secret_do_not_use_in_production (hash in 009 / 007), you must either run this seed with the matching
-- bcrypt or change the app .env to the secret that matches the DB hash.
-- ============================================================================

INSERT INTO oauth_clients (
    client_id, client_secret_hash, client_name, description, logo_url,
    dev_url, prod_url, redirect_uris, allowed_scopes, is_active, created_by
) VALUES (
    'rizervox_r1z2r3v4',
    '$2b$12$fcFb0zoGgNSLwP7osLgrwOJ5e3D8Sz61xkFm2e44c5U0KeTTu82qO',
    'Rizervox CMS',
    'Self-hosted multi-tenant Content OS: CMS + SEO + AI-discoverability + Proof Graph + AI Trust Layer + MCP, for AI Epic Studio sites.',
    'https://cdn.aiepic.app/logos/tools-cms.png',
    'http://localhost:17513',
    'https://rizervox.com',
    ARRAY[
        'http://localhost:17513/oauth/complete',
        'https://rizervox.com/oauth/complete'
    ],
    ARRAY['profile','email','subscription'],
    true,
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
) ON CONFLICT (client_id) DO UPDATE SET
    client_name      = EXCLUDED.client_name,
    description      = EXCLUDED.description,
    logo_url         = EXCLUDED.logo_url,
    dev_url          = EXCLUDED.dev_url,
    prod_url         = EXCLUDED.prod_url,
    redirect_uris    = EXCLUDED.redirect_uris,
    allowed_scopes   = EXCLUDED.allowed_scopes,
    is_active        = EXCLUDED.is_active,
    updated_at       = NOW();

INSERT INTO app_access_rules (app_id, mode, created_by)
SELECT id, 'all_users', (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
FROM oauth_clients WHERE client_id = 'rizervox_r1z2r3v4'
ON CONFLICT (app_id) DO UPDATE SET mode = EXCLUDED.mode, updated_at = NOW();

INSERT INTO user_app_preferences (user_id, app_client_id, is_favorite, last_launched_at, launch_count)
SELECT id, 'rizervox_r1z2r3v4', true, NOW() - INTERVAL '2 days', 5
FROM users WHERE email = 'admin@example.com'
ON CONFLICT (user_id, app_client_id) DO UPDATE SET
    is_favorite = EXCLUDED.is_favorite, last_launched_at = EXCLUDED.last_launched_at,
    launch_count = EXCLUDED.launch_count, updated_at = NOW();
