-- Comprehensive diagnosis of users table issues

-- 1. Check all columns and their constraints
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 2. Check for NOT NULL constraints
SELECT
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND is_nullable = 'NO'
AND column_default IS NULL;

-- 3. Check for unique constraints
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'users'
AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');

-- 4. Check for triggers
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- 5. Try the EXACT insert that your app would do
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'app-test-' || substr(test_id::text, 1, 8) || '@example.com';
    test_username TEXT := 'apptest' || substr(test_id::text, 1, 8);
BEGIN
    RAISE NOTICE 'Testing insert with:';
    RAISE NOTICE '  id: %', test_id;
    RAISE NOTICE '  email: %', test_email;
    RAISE NOTICE '  username: %', test_username;

    -- This mimics exactly what your app does
    INSERT INTO users (id, email, username, full_name)
    VALUES (
        test_id,
        test_email,
        test_username,
        'App Test User'
    );

    RAISE NOTICE '✅ INSERT successful!';

    -- Show what was inserted
    SELECT * FROM users WHERE id = test_id;

    -- Clean up
    DELETE FROM users WHERE id = test_id;

    RAISE NOTICE '✅ All operations successful. The issue might be permissions or context.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ INSERT failed with error:';
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
        RAISE NOTICE 'SQLERRM: %', SQLERRM;
        RAISE NOTICE 'Detail: %', SQLERRM;
END $$;

-- 6. Check if RLS is blocking based on user context
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- 7. List ALL policies (including restrictive ones)
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;
