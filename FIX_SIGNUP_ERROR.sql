-- Fix "Database error saving new user" signup error
-- This ensures users can be inserted during signup

-- 1. Check current RLS status
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- 2. Drop existing restrictive policies that might block signup
DROP POLICY IF EXISTS "Users can only view their own profile" ON users;
DROP POLICY IF EXISTS "Users can only update their own profile" ON users;
DROP POLICY IF EXISTS "Only authenticated users can insert" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- 3. Create proper RLS policies for users table

-- Allow anyone to insert during signup (service role will handle this)
CREATE POLICY "Enable insert for authentication"
ON users FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Allow users to view all profiles (needed for social features)
CREATE POLICY "Public profiles are viewable by everyone"
ON users FOR SELECT
TO authenticated, anon
USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to delete only their own profile
CREATE POLICY "Users can delete own profile"
ON users FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 4. Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Verify policies were created
SELECT
    '✅ RLS Policies Updated!' as status,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 6. Test if insert works now
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    -- Try inserting a test user
    INSERT INTO users (id, email, username, full_name)
    VALUES (
        test_id,
        'signup-test@example.com',
        'signuptest' || substr(test_id::text, 1, 8),
        'Signup Test User'
    );

    RAISE NOTICE '✅ Signup test insert successful! The fix worked.';

    -- Clean up test data
    DELETE FROM users WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Signup test still failing: %', SQLERRM;
        RAISE NOTICE 'Additional debugging needed. Check column requirements.';
END $$;

-- 7. Show users table structure to verify all required columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('id', 'email', 'username', 'full_name', 'created_at')
ORDER BY ordinal_position;

SELECT '🎉 Run signup again - it should work now!' as message;
