-- ============================================================================
-- Client-App Roles (appsuper / appglobal) - PostgreSQL Schema
-- ============================================================================
-- Created: 2026-08-11
-- Purpose: Role assignments of registered users to client applications.
--          appsuper  = per-app role (app_id NOT NULL)
--          appglobal = all-apps role (app_id NULL, covers present/future apps)
--          Also extends app_audit_log.event_type CHECK with role events.
-- Idempotent: every statement is IF NOT EXISTS or catalog-guarded.
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,  -- NULL = appglobal (all-apps)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    granted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_app_role CHECK (role IN ('appsuper', 'appglobal')),  -- extend via later migration (R6.2)
    CONSTRAINT valid_role_scope CHECK (                                   -- scope pairing (R6.1)
        (role = 'appsuper'  AND app_id IS NOT NULL) OR
        (role = 'appglobal' AND app_id IS NULL)
    )
);

-- Uniqueness per role (partial indexes are NULL-safe on all supported PG versions):
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_roles_appsuper
    ON app_user_roles(app_id, user_id, role) WHERE app_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_user_roles_appglobal
    ON app_user_roles(user_id, role) WHERE app_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_app_user_roles_user ON app_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_roles_app ON app_user_roles(app_id);

-- Convergence guard: if the table already exists but was created without the
-- app_id foreign key (e.g. by the back-auth metadata mirror, which cannot
-- reference oauth_clients), add it here so both startup channels converge to
-- the same shape. No-op when the constraint is already present.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_attribute a
            ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'app_user_roles'::regclass
          AND c.confrelid = 'oauth_clients'::regclass
          AND c.contype = 'f'
          AND a.attname = 'app_id'
    ) THEN
        ALTER TABLE app_user_roles
            ADD CONSTRAINT fk_app_user_roles_app
            FOREIGN KEY (app_id) REFERENCES oauth_clients(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Extend app_audit_log event types with role grant/revoke events.
-- Catalog-guarded drop-and-recreate: re-runs are no-ops.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'valid_event_type'
          AND conrelid = 'app_audit_log'::regclass
          AND pg_get_constraintdef(oid) NOT LIKE '%app_role_granted%'
    ) THEN
        ALTER TABLE app_audit_log DROP CONSTRAINT valid_event_type;
        ALTER TABLE app_audit_log ADD CONSTRAINT valid_event_type CHECK (event_type IN (
            'created', 'updated', 'deleted', 'activated', 'deactivated',
            'secret_regenerated', 'access_modified', 'redirect_uri_added',
            'redirect_uri_removed', 'scope_added', 'scope_removed',
            'app_role_granted', 'app_role_revoked'
        ));
    END IF;
END
$$;

-- Grant access to back-api service role (if it exists), same pattern as 012
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'back_api') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON app_user_roles TO back_api;
    END IF;
END
$$;

COMMENT ON TABLE app_user_roles IS 'Client-app role assignments (appsuper per-app, appglobal all-apps); no tools-dashboard privilege';
COMMENT ON COLUMN app_user_roles.app_id IS 'OAuth client UUID; NULL means appglobal (all apps, present and future)';
COMMENT ON COLUMN app_user_roles.role IS 'Client-app role string (registry: appsuper, appglobal)';
COMMENT ON COLUMN app_user_roles.granted_by IS 'Platform admin user ID who granted the role';
