-- Keyspace creation (if not exists)
CREATE KEYSPACE IF NOT EXISTS tools_dashboard
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

USE tools_dashboard;

-- Subscription package metadata table
-- Stores variable/flexible data like features, descriptions, benefits
CREATE TABLE IF NOT EXISTS subscription_package_metadata (
    package_slug text,
    metadata_key text,
    metadata_value text,
    metadata_type text,
    display_order int,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY (package_slug, metadata_key)
) WITH CLUSTERING ORDER BY (metadata_key ASC);

-- Create index for efficient queries by metadata type
CREATE INDEX IF NOT EXISTS idx_metadata_type ON subscription_package_metadata(metadata_type);

-- Subscription features table
-- Stores individual features for each package
CREATE TABLE IF NOT EXISTS subscription_features (
    package_slug text,
    feature_id text,
    feature_name text,
    feature_description text,
    is_included boolean,
    display_order int,
    icon text,
    category text,
    created_at timestamp,
    updated_at timestamp,
    PRIMARY KEY (package_slug, feature_id)
) WITH CLUSTERING ORDER BY (feature_id ASC);

-- Create index for efficient queries by category
CREATE INDEX IF NOT EXISTS idx_features_category ON subscription_features(category);
CREATE INDEX IF NOT EXISTS idx_features_included ON subscription_features(is_included);
