-- Fix follows table RLS policies

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
DROP POLICY IF EXISTS "Users can view follows" ON follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON follows;
DROP POLICY IF EXISTS "Enable delete for users" ON follows;

-- 2. Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 3. Create new permissive policies

-- Allow authenticated users to insert follows (follow someone)
CREATE POLICY "Allow authenticated users to follow"
ON follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Allow authenticated users to delete their follows (unfollow)
CREATE POLICY "Allow authenticated users to unfollow"
ON follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Allow everyone to view follows (needed for social features)
CREATE POLICY "Allow everyone to view follows"
ON follows FOR SELECT
TO public
USING (true);

-- 4. Verify policies were created
SELECT
    '✅ Follows policies fixed!' as status,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'follows'
ORDER BY cmd, policyname;

-- 5. Test insert
DO $$
DECLARE
    test_follower UUID := gen_random_uuid();
    test_following UUID := gen_random_uuid();
BEGIN
    -- Create test users
    INSERT INTO users (id, email, username, full_name)
    VALUES
        (test_follower, 'test-follower@example.com', 'test_follower', 'Test Follower'),
        (test_following, 'test-following@example.com', 'test_following', 'Test Following')
    ON CONFLICT DO NOTHING;

    -- Test follow
    INSERT INTO follows (follower_id, following_id)
    VALUES (test_follower, test_following);

    RAISE NOTICE '✅ Follow test successful!';

    -- Clean up
    DELETE FROM follows WHERE follower_id = test_follower;
    DELETE FROM users WHERE id IN (test_follower, test_following);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Follow test failed: %', SQLERRM;
END $$;

SELECT '🎉 Try following someone now - it should work!' as message;
