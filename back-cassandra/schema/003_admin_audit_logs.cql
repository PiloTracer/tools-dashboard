-- Admin audit logs table
-- Tracks all administrative actions on user accounts

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID,
    timestamp TIMESTAMP,
    admin_id TEXT,
    admin_email TEXT,
    user_id TEXT,
    action TEXT,
    changes MAP<TEXT, TEXT>,
    ip_address TEXT,
    user_agent TEXT,
    PRIMARY KEY (id)
);

-- Index for querying by user_id
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON admin_audit_logs(user_id);

-- Index for querying by admin_id
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id);

-- Index for querying by action
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);

-- Index for querying by timestamp (for recent logs)
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON admin_audit_logs(timestamp);
