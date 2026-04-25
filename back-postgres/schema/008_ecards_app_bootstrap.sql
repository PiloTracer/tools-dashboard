-- ============================================================================
-- E-Cards app library bootstrap (insert-only)
-- ============================================================================
-- Runs with other schema/*.sql on every back-postgres-service start.
-- Inserts the default row **only if missing** (`ON CONFLICT DO NOTHING`). Does not
-- overwrite admin edits after the first insert. Fresh volume → row appears; existing DB → no-op.
-- Dev client secret (dev only): dev_secret_do_not_use_in_production
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
    '/app/app-library-logos/ecards.svg',
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

INSERT INTO app_access_rules (app_id, mode, created_by)
SELECT
    id,
    'all_users',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
FROM oauth_clients
WHERE client_id = 'ecards_a1b2c3d4'
ON CONFLICT (app_id) DO NOTHING;

DELETE FROM oauth_clients WHERE client_id = 'ecards_app_dev';
