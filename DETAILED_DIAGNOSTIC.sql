-- ============================================================================
-- DETAILED DIAGNOSTIC - Find the exact problem
-- ============================================================================

-- 1. Check what columns actually exist in users table
SELECT '1️⃣ USERS TABLE COLUMNS' as step;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('id', 'email', 'points', 'points_balance', 'wallet_balance')
ORDER BY column_name;

-- 2. Check actual user data (as admin)
SELECT '2️⃣ ACTUAL USER DATA' as step;
SELECT
  id,
  email,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'points_balance')
    THEN (SELECT points_balance FROM users u2 WHERE u2.id = users.id)
    ELSE NULL
  END as points_balance_value,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'points')
    THEN (SELECT points FROM users u3 WHERE u3.id = users.id)
    ELSE NULL
  END as points_value,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 3;

-- 3. Check RLS policies
SELECT '3️⃣ RLS POLICIES ON USERS TABLE' as step;
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 4. Check if RLS is enabled
SELECT '4️⃣ RLS STATUS' as step;
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- 5. Test query that app is trying to run
SELECT '5️⃣ SIMULATING APP QUERY' as step;

-- Try to select points_balance for a specific user
DO $$
DECLARE
  test_user_id UUID;
  test_result RECORD;
BEGIN
  -- Get first user
  SELECT id INTO test_user_id FROM users LIMIT 1;

  RAISE NOTICE 'Testing with user ID: %', test_user_id;

  -- Try the exact query the app uses
  BEGIN
    SELECT points_balance INTO test_result
    FROM users
    WHERE id = test_user_id;

    RAISE NOTICE '✅ Query succeeded. Points balance: %', test_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
  END;
END $$;

-- 6. Check if points_balance column has data
SELECT '6️⃣ POINTS_BALANCE DATA CHECK' as step;

DO $$
DECLARE
  col_exists BOOLEAN;
  user_count INTEGER;
  users_with_points INTEGER;
  total_points BIGINT;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points_balance'
  ) INTO col_exists;

  IF col_exists THEN
    RAISE NOTICE '✅ points_balance column exists';

    -- Count users
    SELECT COUNT(*) INTO user_count FROM users;
    RAISE NOTICE 'Total users: %', user_count;

    -- Count users with points
    EXECUTE 'SELECT COUNT(*) FROM users WHERE points_balance > 0' INTO users_with_points;
    RAISE NOTICE 'Users with points > 0: %', users_with_points;

    -- Total points
    EXECUTE 'SELECT COALESCE(SUM(points_balance), 0) FROM users' INTO total_points;
    RAISE NOTICE 'Total points in system: %', total_points;

    -- Show sample data
    RAISE NOTICE '';
    RAISE NOTICE 'Sample user data:';
    FOR test_result IN EXECUTE 'SELECT email, points_balance FROM users ORDER BY created_at DESC LIMIT 3'
    LOOP
      RAISE NOTICE '  - %: % points', test_result.email, test_result.points_balance;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ points_balance column DOES NOT EXIST!';

    -- Check if points column exists instead
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'points'
    ) INTO col_exists;

    IF col_exists THEN
      RAISE NOTICE '⚠️  Found "points" column instead of "points_balance"';
      RAISE NOTICE 'Need to rename: ALTER TABLE users RENAME COLUMN points TO points_balance;';
    END IF;
  END IF;
END $$;
