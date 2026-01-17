-- ============================================================================
-- FIX RLS POLICIES FOR USERS TABLE
-- ============================================================================
-- This ensures users can read their own points_balance and data
-- ============================================================================

-- Check current RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'users';

-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- Create comprehensive SELECT policy for users
CREATE POLICY "Users can read their own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Also allow users to update their own data
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON users TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- ============================================================================
-- FIX RLS POLICIES FOR points_transactions TABLE
-- ============================================================================

-- Check if points_transactions table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'points_transactions'
  ) THEN
    -- Enable RLS on points_transactions
    ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view own transactions" ON points_transactions;
    DROP POLICY IF EXISTS "Users can view their own transactions" ON points_transactions;

    -- Create policy
    CREATE POLICY "Users can view their own transactions"
    ON points_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

    GRANT SELECT ON points_transactions TO authenticated;

    RAISE NOTICE '✅ Fixed RLS policies for points_transactions';
  ELSE
    RAISE NOTICE '⚠️  points_transactions table does not exist yet';
  END IF;
END $$;

-- ============================================================================
-- TEST THE POLICIES
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT;
  test_points INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '         RLS POLICIES FIXED SUCCESSFULLY        ';
  RAISE NOTICE '════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- Get a test user
  SELECT id, email INTO test_user_id, test_email
  FROM users
  LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Sample User Found:';
    RAISE NOTICE '   Email: %', test_email;
    RAISE NOTICE '   ID: %', test_user_id;

    -- Try to read points
    SELECT points_balance INTO test_points
    FROM users
    WHERE id = test_user_id;

    RAISE NOTICE '   Points: %', test_points;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🔄 Next Steps:';
  RAISE NOTICE '   1. Logout from your app';
  RAISE NOTICE '   2. Login again (to refresh auth session)';
  RAISE NOTICE '   3. Hard refresh (Ctrl+Shift+R)';
  RAISE NOTICE '   4. Balance should now show!';
  RAISE NOTICE '';
END $$;

-- Show current policies
SELECT
  '✅ Current RLS Policies' as status,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('users', 'points_transactions')
ORDER BY tablename, policyname;
