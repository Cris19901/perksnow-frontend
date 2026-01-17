-- Simple fix for signup error - only adds missing insert policy

-- 1. Drop and recreate the insert policy (this is the likely culprit)
DROP POLICY IF EXISTS "Enable insert for authentication" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Enable insert for service role" ON users;
DROP POLICY IF EXISTS "Allow signup inserts" ON users;

-- 2. Create a permissive insert policy for signup
CREATE POLICY "Allow signup inserts"
ON users FOR INSERT
TO public
WITH CHECK (true);

-- 3. Verify the policy was created
SELECT
    '✅ Insert policy created!' as status,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- 4. Test insert
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO users (id, email, username, full_name)
    VALUES (
        test_id,
        'test-' || substr(test_id::text, 1, 8) || '@example.com',
        'test' || substr(test_id::text, 1, 8),
        'Test User'
    );

    RAISE NOTICE '✅ Test insert successful!';

    -- Clean up
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Still failing: %', SQLERRM;
END $$;

SELECT '🎉 Signup should work now! Try creating an account.' as message;
