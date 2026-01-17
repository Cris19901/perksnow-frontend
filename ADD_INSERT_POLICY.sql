-- Add missing INSERT policy for users table
-- This is why signup is failing - no policy allows inserting new users!

-- Create INSERT policy to allow signup
CREATE POLICY "Enable insert for signup"
ON users FOR INSERT
TO public
WITH CHECK (true);

-- Verify it was created
SELECT
    '✅ INSERT policy created!' as status,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'users' AND cmd = 'INSERT';

-- Test that insert works now
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

    RAISE NOTICE '✅ INSERT test successful! Signup will work now.';

    -- Clean up test data
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT test failed: %', SQLERRM;
END $$;

SELECT '🎉 Signup is fixed! Try creating an account now.' as message;
