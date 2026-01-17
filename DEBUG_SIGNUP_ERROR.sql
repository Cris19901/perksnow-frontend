-- Debug signup error: "Database error saving new user"
-- Run this in Supabase SQL Editor to check and fix the issue

-- 1. Check if users table exists and its structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check RLS policies on users table
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users';

-- 3. Check if RLS is enabled on users table
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- 4. Check for any triggers on users table that might be failing
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 5. Try to manually insert a test user (to see exact error)
-- This will show you the exact error message
DO $$
BEGIN
    -- Try inserting with a fake UUID
    INSERT INTO users (id, email, username, full_name)
    VALUES (
        gen_random_uuid(),
        'test@example.com',
        'testuser123',
        'Test User'
    );

    RAISE NOTICE '✅ Test insert successful';

    -- Clean up test data
    DELETE FROM users WHERE email = 'test@example.com';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;
