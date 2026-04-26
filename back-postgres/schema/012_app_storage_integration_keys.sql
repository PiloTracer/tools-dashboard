-- Per-app storage integration keys (Tools Dashboard–issued; not raw Seaweed keys).
-- Keys authenticate to back-api integration endpoints; back-api uses service Seaweed credentials internally.

CREATE TABLE IF NOT EXISTS app_storage_integration_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    token_fingerprint VARCHAR(64) NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix VARCHAR(32) NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by INTEGER REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_storage_keys_fingerprint
    ON app_storage_integration_keys (token_fingerprint);

CREATE INDEX IF NOT EXISTS idx_app_storage_keys_app_id
    ON app_storage_integration_keys (app_id);

COMMENT ON TABLE app_storage_integration_keys IS
    'Opaque integration keys per app-library client; used with Bearer auth on back-api storage integration routes';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'back_api') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON app_storage_integration_keys TO back_api;
    END IF;
END
$$;
