-- Check follows table RLS policies

-- 1. Check if follows table exists
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'follows'
ORDER BY ordinal_position;

-- 2. Check RLS policies on follows table
SELECT
    policyname,
    cmd,
    roles,
    CASE
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as with_check_clause
FROM pg_policies
WHERE tablename = 'follows'
ORDER BY cmd, policyname;

-- 3. Check if RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'follows';

-- 4. Test if insert works
DO $$
DECLARE
    test_follower UUID := gen_random_uuid();
    test_following UUID := gen_random_uuid();
BEGIN
    -- Create dummy users for testing
    INSERT INTO users (id, email, username, full_name)
    VALUES
        (test_follower, 'follower@test.com', 'follower_test', 'Follower Test'),
        (test_following, 'following@test.com', 'following_test', 'Following Test')
    ON CONFLICT DO NOTHING;

    -- Try to insert a follow relationship
    INSERT INTO follows (follower_id, following_id)
    VALUES (test_follower, test_following);

    RAISE NOTICE '✅ Follow insert successful!';

    -- Clean up
    DELETE FROM follows WHERE follower_id = test_follower;
    DELETE FROM users WHERE id IN (test_follower, test_following);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Follow insert failed: %', SQLERRM;
END $$;
