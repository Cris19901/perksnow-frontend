-- ============================================================================
-- ADD ADMIN COLUMN TO USERS TABLE
-- ============================================================================
-- This adds the is_admin column needed for the admin settings system
-- ============================================================================

-- 1. Add is_admin column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- 3. (Optional) Set yourself as admin - Replace 'your-email@example.com' with your actual email
-- UPDATE users
-- SET is_admin = true
-- WHERE email = 'your-email@example.com';

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'Admin column added successfully!' as status;

-- Verify
SELECT id, email, username, is_admin
FROM users
WHERE is_admin = true;
