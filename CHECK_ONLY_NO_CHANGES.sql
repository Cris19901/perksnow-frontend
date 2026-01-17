-- ============================================================================
-- CHECK ONLY - No changes, just diagnostics
-- ============================================================================

-- 1. Check columns
SELECT
  '1️⃣ COLUMNS IN USERS TABLE' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('id', 'email', 'points', 'points_balance', 'wallet_balance')
ORDER BY column_name;

-- 2. Check actual data
SELECT
  '2️⃣ SAMPLE USER DATA' as check_name,
  email,
  points_balance,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 3;

-- 3. Check RLS policies
SELECT
  '3️⃣ RLS POLICIES' as check_name,
  tablename,
  policyname,
  cmd as operation,
  roles,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_status
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 4. Check RLS status
SELECT
  '4️⃣ RLS ENABLED STATUS' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'users';

-- 5. Summary
DO $$
DECLARE
  has_points_balance BOOLEAN;
  has_points BOOLEAN;
  user_count INTEGER;
  users_with_balance INTEGER;
  total_balance BIGINT;
  sample_email TEXT;
  sample_balance INTEGER;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '              DIAGNOSTIC SUMMARY                    ';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points_balance'
  ) INTO has_points_balance;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points'
  ) INTO has_points;

  RAISE NOTICE '📊 Database Columns:';
  RAISE NOTICE '   points_balance: %', CASE WHEN has_points_balance THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   points: %', CASE WHEN has_points THEN '⚠️ EXISTS (should be renamed)' ELSE '✅ Not present' END;
  RAISE NOTICE '';

  -- Check data
  IF has_points_balance THEN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO users_with_balance FROM users WHERE points_balance > 0;
    SELECT COALESCE(SUM(points_balance), 0) INTO total_balance FROM users;

    RAISE NOTICE '👥 User Data:';
    RAISE NOTICE '   Total users: %', user_count;
    RAISE NOTICE '   Users with points: %', users_with_balance;
    RAISE NOTICE '   Total points: %', total_balance;
    RAISE NOTICE '';

    -- Get sample user
    SELECT email, points_balance INTO sample_email, sample_balance
    FROM users
    ORDER BY created_at DESC
    LIMIT 1;

    RAISE NOTICE '   Sample user: % has % points', sample_email, sample_balance;
    RAISE NOTICE '';
  END IF;

  -- Check RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'users';

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users';

  RAISE NOTICE '🔒 Security (RLS):';
  RAISE NOTICE '   RLS enabled: %', CASE WHEN rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE '   Policy count: %', policy_count;

  IF policy_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '   Policies:';
    FOR r IN SELECT policyname, cmd FROM pg_policies WHERE tablename = 'users' ORDER BY policyname
    LOOP
      RAISE NOTICE '     - %: %', r.policyname, r.cmd;
    END LOOP;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '              DIAGNOSIS                             ';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Diagnosis
  IF NOT has_points_balance AND has_points THEN
    RAISE NOTICE '❌ PROBLEM: Column is named "points" not "points_balance"';
    RAISE NOTICE '   FIX: Run ALTER TABLE users RENAME COLUMN points TO points_balance;';
  ELSIF has_points_balance AND users_with_balance = 0 THEN
    RAISE NOTICE '⚠️ PROBLEM: Column exists but all users have 0 points';
    RAISE NOTICE '   FIX: Check signup bonus trigger is working';
  ELSIF has_points_balance AND NOT rls_enabled THEN
    RAISE NOTICE '⚠️ INFO: RLS is disabled (data is public)';
  ELSIF has_points_balance AND rls_enabled AND policy_count = 0 THEN
    RAISE NOTICE '❌ PROBLEM: RLS enabled but no policies exist';
    RAISE NOTICE '   FIX: Create SELECT policy for authenticated users';
  ELSIF has_points_balance AND users_with_balance > 0 AND rls_enabled AND policy_count > 0 THEN
    RAISE NOTICE '✅ DATABASE LOOKS CORRECT!';
    RAISE NOTICE '';
    RAISE NOTICE '   If balance still not showing in app:';
    RAISE NOTICE '   1. Logout and login again (refresh auth token)';
    RAISE NOTICE '   2. Hard refresh app (Ctrl+Shift+R)';
    RAISE NOTICE '   3. Check browser console for errors';
    RAISE NOTICE '   4. Verify you are on correct environment (dev vs prod)';
  ELSE
    RAISE NOTICE '❓ UNCLEAR: Please share these results for analysis';
  END IF;

  RAISE NOTICE '';
END $$;
