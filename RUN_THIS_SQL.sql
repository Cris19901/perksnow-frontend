-- ============================================
-- REQUIRED SQL MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add phone_number column to users table
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users
    ADD COLUMN phone_number TEXT;

    RAISE NOTICE '✅ phone_number column added successfully';
  ELSE
    RAISE NOTICE 'ℹ️  phone_number column already exists';
  END IF;
END $$;

-- 2. Grant admin privileges to fadiscojay@gmail.com
-- ============================================
UPDATE users
SET is_admin = true
WHERE email = 'fadiscojay@gmail.com';

-- 3. Verify all changes
-- ============================================
-- Check phone_number column exists
SELECT
  'phone_number column check' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'phone_number';

-- Verify admin privilege granted
SELECT
  'Admin privilege check' as check_name,
  id,
  email,
  username,
  is_admin,
  created_at
FROM users
WHERE email = 'fadiscojay@gmail.com';

-- ============================================
-- EXPECTED RESULTS:
-- 1. phone_number column should show: TEXT, YES (nullable)
-- 2. fadiscojay@gmail.com should show: is_admin = true
-- ============================================
