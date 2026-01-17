-- ============================================
-- QUICK MIGRATION SCRIPT
-- ============================================
-- This is a simplified version for quick migration
-- Use this after importing Sngine tables into your database
--
-- STEPS BEFORE RUNNING:
-- 1. Import your Sngine dump file into Supabase
-- 2. Rename the imported tables:
--    ALTER TABLE users RENAME TO sngine_users_temp;
--    ALTER TABLE posts RENAME TO sngine_posts_temp;
--    ALTER TABLE posts_photos RENAME TO sngine_posts_photos_temp;
-- 3. Run this script
-- ============================================

-- Create mapping table
CREATE TABLE IF NOT EXISTS sngine_id_mappings (
  entity_type TEXT NOT NULL,
  old_id INTEGER NOT NULL,
  new_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (entity_type, old_id)
);

-- Migrate Users (simplified version with basic conflict handling)
INSERT INTO users (
  id,
  username,
  email,
  full_name,
  bio,
  avatar_url,
  cover_image_url,
  location,
  website,
  is_verified,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  LOWER(user_name) || CASE
    WHEN EXISTS(SELECT 1 FROM users WHERE username = LOWER(user_name))
    THEN user_id::TEXT
    ELSE ''
  END as username,
  LOWER(user_email) || CASE
    WHEN EXISTS(SELECT 1 FROM users WHERE email = LOWER(user_email))
    THEN '+sng' || user_id::TEXT || '@migrated.com'
    ELSE ''
  END as email,
  TRIM(COALESCE(user_firstname, '') || ' ' || COALESCE(user_lastname, '')) as full_name,
  NULLIF(TRIM(user_biography), '') as bio,
  NULLIF(TRIM(user_picture), '') as avatar_url,
  NULLIF(TRIM(user_cover), '') as cover_image_url,
  NULLIF(TRIM(user_current_city), '') as location,
  NULLIF(TRIM(user_website), '') as website,
  (user_verified = '1') as is_verified,
  COALESCE(user_registered, NOW()) as created_at,
  COALESCE(user_last_seen, NOW()) as updated_at
FROM sngine_users_temp
WHERE user_activated = '1' AND user_banned = '0'
RETURNING id, username
INTO sngine_id_mappings (new_id, entity_type);

-- Note: The above is a simplified version
-- For production, use the full sngine-migration.sql script instead

RAISE NOTICE '⚠️  This is a quick migration script for testing only.';
RAISE NOTICE 'For production migration, use sngine-migration.sql';
RAISE NOTICE 'See SNGINE_MIGRATION_GUIDE.md for full instructions.';
