-- Grant direct permissions to anon and authenticated roles
-- This should fix the "permission denied" error

-- 1. Grant SELECT permission to anon role on post_images
GRANT SELECT ON post_images TO anon;
GRANT SELECT ON post_images TO authenticated;

-- 2. Grant SELECT permission on posts table
GRANT SELECT ON posts TO anon;
GRANT SELECT ON posts TO authenticated;

-- 3. Grant SELECT permission on users table
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- 4. Grant INSERT/UPDATE/DELETE to authenticated users (for their own data)
GRANT INSERT, UPDATE, DELETE ON post_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON posts TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- 5. Verify grants were applied
SELECT
    grantee,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('posts', 'post_images', 'users')
AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions granted!';
  RAISE NOTICE '✅ Refresh browser - feed should load now!';
END $$;
