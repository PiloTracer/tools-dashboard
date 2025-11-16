-- OAuth 2.0 Tables for Auto-Auth Feature
-- Version: 1.0.0
-- Created: 2025-11-15

-- ============================================================================
-- OAuth Clients Table
-- Stores registered OAuth 2.0 clients (external applications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(255) UNIQUE NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    client_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    redirect_uris TEXT[] NOT NULL,  -- Array of allowed redirect URIs
    allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['profile', 'email'],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX idx_oauth_clients_is_active ON oauth_clients(is_active);
CREATE INDEX idx_oauth_clients_created_at ON oauth_clients(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_oauth_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_oauth_clients_updated_at
    BEFORE UPDATE ON oauth_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_oauth_clients_updated_at();

COMMENT ON TABLE oauth_clients IS 'Registered OAuth 2.0 clients for external application integration';
COMMENT ON COLUMN oauth_clients.client_id IS 'Unique client identifier (e.g., ecards_app)';
COMMENT ON COLUMN oauth_clients.client_secret_hash IS 'bcrypt hash of client secret';
COMMENT ON COLUMN oauth_clients.redirect_uris IS 'Array of allowed OAuth redirect URIs';
COMMENT ON COLUMN oauth_clients.allowed_scopes IS 'Array of scopes this client can request';

-- ============================================================================
-- OAuth User Consents Table
-- Stores user consent for OAuth clients (remember consent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    scope TEXT[] NOT NULL,  -- Array of granted scopes
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, client_id)
);

CREATE INDEX idx_oauth_consents_user_id ON oauth_consents(user_id);
CREATE INDEX idx_oauth_consents_client_id ON oauth_consents(client_id);
CREATE INDEX idx_oauth_consents_granted_at ON oauth_consents(granted_at DESC);

COMMENT ON TABLE oauth_consents IS 'User consent records for OAuth clients';
COMMENT ON COLUMN oauth_consents.scope IS 'Array of scopes user granted to this client';

-- ============================================================================
-- OAuth API Keys Table
-- Stores API keys for external applications to access admin APIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) UNIQUE NOT NULL,  -- bcrypt hash of API key
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_oauth_api_keys_key_hash ON oauth_api_keys(key_hash);
CREATE INDEX idx_oauth_api_keys_client_id ON oauth_api_keys(client_id);
CREATE INDEX idx_oauth_api_keys_is_active ON oauth_api_keys(is_active);
CREATE INDEX idx_oauth_api_keys_expires_at ON oauth_api_keys(expires_at);
CREATE INDEX idx_oauth_api_keys_created_at ON oauth_api_keys(created_at DESC);

COMMENT ON TABLE oauth_api_keys IS 'API keys for external applications to access admin endpoints';
COMMENT ON COLUMN oauth_api_keys.key_hash IS 'bcrypt hash of API key (format: eak_...)';
COMMENT ON COLUMN oauth_api_keys.last_used_at IS 'Last time this API key was used';
COMMENT ON COLUMN oauth_api_keys.expires_at IS 'Optional expiration date for API key';

-- ============================================================================
-- OAuth Usage Events Table
-- Tracks API usage by external applications for billing/analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id),
    client_id VARCHAR(255) NOT NULL REFERENCES oauth_clients(client_id),
    event_type VARCHAR(100) NOT NULL,  -- e.g., 'cards_generated', 'api_call'
    quantity INTEGER DEFAULT 1,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_oauth_usage_events_user_id ON oauth_usage_events(user_id);
CREATE INDEX idx_oauth_usage_events_client_id ON oauth_usage_events(client_id);
CREATE INDEX idx_oauth_usage_events_event_type ON oauth_usage_events(event_type);
CREATE INDEX idx_oauth_usage_events_timestamp ON oauth_usage_events(timestamp DESC);

COMMENT ON TABLE oauth_usage_events IS 'Usage tracking for external applications (billing/analytics)';
COMMENT ON COLUMN oauth_usage_events.event_type IS 'Type of event (e.g., cards_generated, api_call)';
COMMENT ON COLUMN oauth_usage_events.quantity IS 'Quantity of resource used in this event';
COMMENT ON COLUMN oauth_usage_events.metadata IS 'Additional event metadata (JSON)';

-- ============================================================================
-- Insert default OAuth client for testing (development only)
-- ============================================================================

-- This is a test client for E-Cards integration
-- In production, clients should be registered via admin UI
INSERT INTO oauth_clients (
    client_id,
    client_secret_hash,
    client_name,
    description,
    logo_url,
    redirect_uris,
    allowed_scopes
) VALUES (
    'ecards_app_dev',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWVVGVbS',  -- Hash of 'dev_secret_do_not_use_in_production'
    'E-Cards Application (Development)',
    'E-Cards system for digital business card management',
    'http://localhost:7300/logo.png',
    ARRAY['http://localhost:7300/auth/callback', 'http://localhost:7300/oauth/callback'],
    ARRAY['profile', 'email', 'subscription']
) ON CONFLICT (client_id) DO NOTHING;

COMMENT ON TABLE oauth_clients IS 'Development test client created by migration. Remove in production.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant access to back-api service user (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'back_api') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_clients TO back_api;
        GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_consents TO back_api;
        GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_api_keys TO back_api;
        GRANT SELECT, INSERT, UPDATE, DELETE ON oauth_usage_events TO back_api;
    END IF;
END
$$;

-- ============================================================================
-- Cleanup/Maintenance Functions
-- ============================================================================

-- Function to clean up expired authorization codes
-- (Authorization codes are stored in Cassandra, but this is for reference)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_data()
RETURNS void AS $$
BEGIN
    -- Mark inactive API keys that have expired
    UPDATE oauth_api_keys
    SET is_active = false
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
      AND is_active = true;

    -- Delete usage events older than 2 years (for GDPR compliance)
    DELETE FROM oauth_usage_events
    WHERE timestamp < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_oauth_data IS 'Cleanup function for expired OAuth data. Run daily via cron.';
