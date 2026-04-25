-- Replace non-resolving placeholder logo URLs (cdn.example.com) with same-origin static assets
-- served by front-public public/app-library-logos/ (see infra/nginx * app-library-logos location).
UPDATE oauth_clients
SET
    logo_url = '/app/app-library-logos/ecards.svg',
    updated_at = NOW()
WHERE client_id = 'ecards_a1b2c3d4'
  AND (logo_url LIKE '%cdn.example.com%' OR logo_url LIKE 'https://cdn.example.com%');

UPDATE oauth_clients
SET
    logo_url = '/app/app-library-logos/rizervox.svg',
    updated_at = NOW()
WHERE client_id = 'rizervox_r1z2r3v4'
  AND (logo_url LIKE '%cdn.example.com%' OR logo_url LIKE 'https://cdn.example.com%');
