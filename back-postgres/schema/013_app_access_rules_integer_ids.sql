-- ============================================================================
-- Fix app_access_rules.user_ids type (UUID[] → INTEGER[])
-- ============================================================================
-- Created: 2025-07-11
-- Purpose: The app_access_rules.user_ids column was defined as UUID[] but the
--          entire system uses integer user IDs. This makes the 'only_specified'
--          and 'all_except' access modes non-functional — they rely on comparing
--          integer user IDs against this array.
-- ============================================================================

-- Drop the GIN index first (requires compatible type)
DROP INDEX IF EXISTS idx_access_rules_user_ids;

-- Change column type: UUID[] → INTEGER[]
-- The USING clause handles the cast: an empty array (the default and only
-- realistic value — the broken modes never successfully stored data) passes
-- through cleanly.
ALTER TABLE app_access_rules
    ALTER COLUMN user_ids DROP DEFAULT,
    ALTER COLUMN user_ids TYPE INTEGER[]
        USING user_ids::TEXT[]::INTEGER[],
    ALTER COLUMN user_ids SET DEFAULT ARRAY[]::INTEGER[];

-- Recreate the GIN index for the new type
CREATE INDEX IF NOT EXISTS idx_access_rules_user_ids
    ON app_access_rules USING GIN(user_ids);

COMMENT ON COLUMN app_access_rules.user_ids IS 'User IDs (integer) for all_except or only_specified modes';
