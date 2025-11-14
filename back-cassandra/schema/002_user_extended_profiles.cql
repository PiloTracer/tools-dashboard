-- User extended profiles and audit logs schema
-- Part of the user-management feature

USE tools_dashboard;

-- Extended user profiles table
-- Stores progressive profiling data and extended user attributes
-- PostgreSQL is source of truth for core data (email, role, status)
-- Cassandra stores extended profiles + denormalized/canonical copy
CREATE TABLE IF NOT EXISTS user_extended_profiles (
    user_id uuid PRIMARY KEY,

    -- Progressive profiling data (Cassandra source of truth)
    first_name text,
    last_name text,

    -- Contact information
    mobile_phone text,
    home_phone text,
    work_phone text,

    -- Address information
    address_line1 text,
    address_line2 text,
    city text,
    state_province text,
    postal_code text,
    country text,

    -- Professional information
    company text,
    job_title text,
    department text,
    industry text,

    -- Profile picture (stored in SeaweedFS object storage)
    -- Future: S3 path format s3://user-profile-pictures/{user_id}_{timestamp}.{ext}
    picture_url text,

    -- Other details
    other_details text,

    -- Preferences (Cassandra source of truth)
    language text,
    timezone text,
    communication_preferences map<text, boolean>,

    -- Profile completion tracking
    profile_completion_percentage int,
    last_profile_update timestamp,
    onboarding_completed boolean,
    onboarding_step int,

    -- Canonical/Denormalized data from PostgreSQL
    -- These are synced from PostgreSQL whenever core data changes
    email text,
    role text,
    status text,

    -- Timestamps
    created_at timestamp,
    updated_at timestamp
) WITH comment = 'Extended user profile data and progressive profiling results';

-- Create index for email lookups (denormalized from PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_user_ext_email ON user_extended_profiles(email);

-- Create index for status (denormalized from PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_user_ext_status ON user_extended_profiles(status);

-- Audit logs table for admin actions
-- Stores all admin actions on users for compliance and tracking
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id uuid,
    timestamp timestamp,
    admin_id text,
    admin_email text,
    user_id text,
    action text,
    changes map<text, text>,
    ip_address text,
    user_agent text,
    PRIMARY KEY (id, timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
  AND comment = 'Audit trail for all admin actions on users';

-- Create index for querying by admin_id
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id);

-- Create index for querying by user_id
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON admin_audit_logs(user_id);

-- Create index for querying by action type
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);
