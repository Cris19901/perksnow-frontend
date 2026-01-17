-- ============================================================================
-- SIMPLE DIAGNOSTIC - Just the facts
-- ============================================================================

-- 1. What columns exist?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('id', 'email', 'points', 'points_balance')
ORDER BY column_name;

-- 2. What data do users have?
SELECT email, points_balance, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- 3. What RLS policies exist?
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 4. Is RLS enabled?
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';
