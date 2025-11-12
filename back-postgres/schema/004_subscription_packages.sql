-- 004_subscription_packages.sql
-- Subscription package definitions and pricing

-- Subscription packages table (core package definitions)
CREATE TABLE IF NOT EXISTS subscription_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_monthly NUMERIC(10, 2) NOT NULL,
    price_yearly NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
    rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_packages_slug ON subscription_packages(slug);

-- Create index on is_active for filtering active packages
CREATE INDEX IF NOT EXISTS idx_subscription_packages_active ON subscription_packages(is_active);

-- Create index on display_order for ordered listings
CREATE INDEX IF NOT EXISTS idx_subscription_packages_display_order ON subscription_packages(display_order);

-- User subscriptions table (tracks user's current subscription)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_packages(id),
    package_slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_active_user_subscription UNIQUE (user_id, status)
);

-- Create index on user_id for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Create index on package_id for analytics
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_package_id ON user_subscriptions(package_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Create index on current_period_end for expiration checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON user_subscriptions(current_period_end);

-- Subscription history table (audit trail of all subscription changes)
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES subscription_packages(id),
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for user history lookups
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);

-- Create index on subscription_id for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);

-- Create index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for subscription_packages
DROP TRIGGER IF EXISTS update_subscription_packages_updated_at ON subscription_packages;
CREATE TRIGGER update_subscription_packages_updated_at
    BEFORE UPDATE ON subscription_packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_subscriptions
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE subscription_packages IS 'Defines available subscription packages/plans with pricing and rate limits';
COMMENT ON TABLE user_subscriptions IS 'Tracks active subscriptions for each user';
COMMENT ON TABLE subscription_history IS 'Audit trail of all subscription changes and events';
COMMENT ON COLUMN subscription_packages.slug IS 'URL-friendly unique identifier (e.g., free, standard, premium, enterprise)';
COMMENT ON COLUMN subscription_packages.rate_limit_per_hour IS 'Maximum API requests per hour for this package';
COMMENT ON COLUMN subscription_packages.rate_limit_per_day IS 'Maximum API requests per day for this package';
COMMENT ON COLUMN user_subscriptions.status IS 'Subscription status: active, cancelled, expired, trial';
COMMENT ON COLUMN user_subscriptions.billing_cycle IS 'Billing frequency: monthly, yearly';
