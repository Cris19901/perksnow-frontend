-- ============================================================================
-- CHECK CURRENT STATUS
-- ============================================================================
-- This checks what's already set up in your database
-- ============================================================================

-- Check what columns exist in users table
SELECT
  '1️⃣ USERS TABLE COLUMNS' as check_step,
  column_name,
  data_type,
  column_default,
  CASE
    WHEN column_name = 'points_balance' THEN '✅ CORRECT'
    WHEN column_name = 'points' THEN '⚠️ NEEDS RENAME'
    ELSE '📝'
  END as status
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('points', 'points_balance', 'wallet_balance', 'id', 'email')
ORDER BY column_name;

-- Check if onboarding functions exist
SELECT
  '2️⃣ ONBOARDING FUNCTIONS' as check_step,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_name IN (
  'mark_onboarding_step_complete',
  'get_user_onboarding_progress'
)
ORDER BY routine_name;

-- Check if signup bonus system exists
SELECT
  '3️⃣ SIGNUP BONUS SYSTEM' as check_step,
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';

-- Check user points
SELECT
  '4️⃣ SAMPLE USER POINTS' as check_step,
  email,
  points_balance,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- Summary
DO $$
DECLARE
  has_points_balance BOOLEAN;
  has_onboarding_funcs BOOLEAN;
  has_signup_bonus BOOLEAN;
  total_users INTEGER;
  total_points BIGINT;
BEGIN
  -- Check points_balance column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points_balance'
  ) INTO has_points_balance;

  -- Check onboarding functions
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'mark_onboarding_step_complete'
  ) INTO has_onboarding_funcs;

  -- Check signup bonus
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'award_signup_bonus'
  ) INTO has_signup_bonus;

  -- Get user stats
  SELECT COUNT(*), COALESCE(SUM(points_balance), 0)
  INTO total_users, total_points
  FROM users;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '                    SYSTEM STATUS REPORT                ';
  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Status:';
  RAISE NOTICE '   points_balance column:    %', CASE WHEN has_points_balance THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   Onboarding functions:     %', CASE WHEN has_onboarding_funcs THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '   Signup bonus system:      %', CASE WHEN has_signup_bonus THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '👥 User Statistics:';
  RAISE NOTICE '   Total users:              %', total_users;
  RAISE NOTICE '   Total points distributed: %', total_points;
  RAISE NOTICE '';

  IF has_points_balance AND has_onboarding_funcs THEN
    RAISE NOTICE '✅ ALL SYSTEMS OPERATIONAL!';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next Steps:';
    RAISE NOTICE '   1. Hard refresh your app (Ctrl+Shift+R)';
    RAISE NOTICE '   2. Check if balance now shows in navigation';
    RAISE NOTICE '   3. Check console for any remaining errors';
    RAISE NOTICE '';
    RAISE NOTICE 'If balance still doesn''t show, check:';
    RAISE NOTICE '   • Browser console for errors';
    RAISE NOTICE '   • RLS policies on users table';
    RAISE NOTICE '   • User is logged in correctly';
  ELSE
    RAISE NOTICE '⚠️  SOME SYSTEMS NEED SETUP';
    IF NOT has_points_balance THEN
      RAISE NOTICE '   → Need to create/rename points_balance column';
    END IF;
    IF NOT has_onboarding_funcs THEN
      RAISE NOTICE '   → Need to create onboarding functions';
    END IF;
    IF NOT has_signup_bonus THEN
      RAISE NOTICE '   → Need to create signup bonus trigger';
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;
