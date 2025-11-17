-- OAuth 2.0 Auth Events Schema for Cassandra
-- Version: 1.0.0
-- Created: 2025-11-15
-- Purpose: Store OAuth authorization codes, tokens, and RSA keys

-- ============================================================================
-- Keyspace: auth_events
-- Stores all authentication and authorization events
-- ============================================================================

CREATE KEYSPACE IF NOT EXISTS auth_events
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    AND durable_writes = true;

USE auth_events;

-- ============================================================================
-- OAuth Authorization Codes Table
-- Stores short-lived authorization codes (10 minutes expiry)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
    code text PRIMARY KEY,
    user_id int,
    client_id text,
    scope set<text>,
    redirect_uri text,
    code_challenge text,
    code_challenge_method text,
    issued_at timestamp,
    expires_at timestamp,
    used boolean,
    used_at timestamp
) WITH default_time_to_live = 600
   AND gc_grace_seconds = 86400
   AND comment = 'OAuth 2.0 authorization codes with PKCE support (10min TTL)';

-- Index for finding codes by user
CREATE INDEX IF NOT EXISTS idx_authcodes_user_id ON oauth_authorization_codes(user_id);

-- Index for finding codes by client
CREATE INDEX IF NOT EXISTS idx_authcodes_client_id ON oauth_authorization_codes(client_id);

-- Index for finding used codes
CREATE INDEX IF NOT EXISTS idx_authcodes_used ON oauth_authorization_codes(used);

-- ============================================================================
-- OAuth Tokens Table
-- Stores access and refresh tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_tokens (
    token_id uuid PRIMARY KEY,
    user_id int,
    client_id text,
    token_type text,  -- 'access' or 'refresh'
    token_hash text,
    scope set<text>,
    issued_at timestamp,
    expires_at timestamp,
    revoked boolean,
    revoked_at timestamp,
    parent_token_id uuid  -- For refresh token rotation tracking
) WITH gc_grace_seconds = 86400
   AND comment = 'OAuth 2.0 access and refresh tokens';

-- Index for finding tokens by hash (for validation)
CREATE INDEX IF NOT EXISTS idx_tokens_hash ON oauth_tokens(token_hash);

-- Index for finding tokens by user
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON oauth_tokens(user_id);

-- Index for finding tokens by client
CREATE INDEX IF NOT EXISTS idx_tokens_client_id ON oauth_tokens(client_id);

-- Index for finding revoked tokens
CREATE INDEX IF NOT EXISTS idx_tokens_revoked ON oauth_tokens(revoked);

-- Index for finding tokens by type
CREATE INDEX IF NOT EXISTS idx_tokens_type ON oauth_tokens(token_type);

-- ============================================================================
-- OAuth Tokens by User Table (for efficient user lookup)
-- Denormalized table for faster user-based queries
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_tokens_by_user (
    user_id int,
    client_id text,
    token_id uuid,
    token_type text,
    issued_at timestamp,
    expires_at timestamp,
    revoked boolean,
    PRIMARY KEY (user_id, client_id, token_id)
) WITH CLUSTERING ORDER BY (client_id ASC, token_id DESC)
   AND gc_grace_seconds = 86400
   AND comment = 'OAuth tokens indexed by user for efficient lookup';

-- ============================================================================
-- OAuth RSA Keys Table
-- Stores RSA key pairs for JWT signing
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_rsa_keys (
    key_id text PRIMARY KEY,
    public_key text,
    private_key text,
    algorithm text,
    created_at timestamp,
    expires_at timestamp,
    is_active boolean
) WITH gc_grace_seconds = 86400
   AND comment = 'RSA key pairs for JWT signing (RS256)';

-- Index for finding active keys
CREATE INDEX IF NOT EXISTS idx_rsa_keys_active ON oauth_rsa_keys(is_active);

-- Index for finding keys by algorithm
CREATE INDEX IF NOT EXISTS idx_rsa_keys_algorithm ON oauth_rsa_keys(algorithm);

-- ============================================================================
-- OAuth Token Revocations Table (for fast revocation checks)
-- Stores revoked token hashes for quick validation
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_token_revocations (
    token_hash text PRIMARY KEY,
    revoked_at timestamp,
    reason text,
    user_id int,
    client_id text
) WITH default_time_to_live = 2592000
   AND gc_grace_seconds = 86400
   AND comment = 'Revoked token hashes for fast validation (30 day TTL)';

-- Index for finding revocations by user
CREATE INDEX IF NOT EXISTS idx_revocations_user_id ON oauth_token_revocations(user_id);

-- Index for finding revocations by client
CREATE INDEX IF NOT EXISTS idx_revocations_client_id ON oauth_token_revocations(client_id);

-- ============================================================================
-- OAuth Session Activity Table (audit log)
-- Tracks OAuth sessions for security monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_session_activity (
    session_id uuid,
    timestamp timestamp,
    user_id int,
    client_id text,
    activity_type text,  -- 'authorization', 'token_issued', 'token_refreshed', 'token_revoked'
    ip_address text,
    user_agent text,
    metadata map<text, text>,
    PRIMARY KEY (session_id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
   AND default_time_to_live = 7776000
   AND gc_grace_seconds = 86400
   AND comment = 'OAuth session activity audit log (90 day TTL)';

-- Index for finding activity by user
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON oauth_session_activity(user_id);

-- Index for finding activity by client
CREATE INDEX IF NOT EXISTS idx_activity_client_id ON oauth_session_activity(client_id);

-- Index for finding activity by type
CREATE INDEX IF NOT EXISTS idx_activity_type ON oauth_session_activity(activity_type);

-- ============================================================================
-- OAuth Session Activity by User (denormalized for user lookups)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_session_activity_by_user (
    user_id int,
    timestamp timestamp,
    session_id uuid,
    client_id text,
    activity_type text,
    ip_address text,
    PRIMARY KEY (user_id, timestamp, session_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, session_id ASC)
   AND default_time_to_live = 7776000
   AND gc_grace_seconds = 86400
   AND comment = 'OAuth session activity indexed by user (90 day TTL)';

-- ============================================================================
-- Initial RSA Key (for development)
-- In production, keys should be generated and rotated automatically
-- ============================================================================

-- Note: This is a placeholder. Actual RSA keys should be generated by back-auth service
-- INSERT INTO oauth_rsa_keys (key_id, algorithm, is_active, created_at)
-- VALUES ('dev-key-2025-11-15', 'RS256', true, toTimestamp(now()))
-- IF NOT EXISTS;

-- ============================================================================
-- Cleanup TTL Explanation
-- ============================================================================

-- Authorization Codes: 10 minutes TTL (auto-deleted)
--   - Prevents replay attacks
--   - Reduces storage overhead
--
-- Tokens: No TTL on main table, manual cleanup via revocation
--   - Access tokens: 1 hour expiry (validated via JWT exp claim)
--   - Refresh tokens: 30 days expiry (validated via expires_at)
--
-- Token Revocations: 30 days TTL (max refresh token lifetime)
--   - After 30 days, all tokens expired anyway
--
-- Session Activity: 90 days TTL (compliance requirement)
--   - Audit trail for security investigations
--   - GDPR/compliance retention policy
