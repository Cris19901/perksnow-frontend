-- ============================================================================
-- TEST: Does signup bonus work for new users?
-- ============================================================================

-- 1. Check current signup bonus trigger
SELECT
  '1️⃣ CURRENT TRIGGER' as step,
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger'
AND event_object_table = 'users';

-- 2. Check trigger function source
SELECT
  '2️⃣ TRIGGER FUNCTION' as step,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';

-- 3. Check signup bonus settings
SELECT
  '3️⃣ BONUS SETTINGS' as step,
  bonus_amount,
  is_enabled
FROM signup_bonus_settings;

-- 4. Create a test user to verify trigger works
DO $$
DECLARE
  v_test_user_id UUID := gen_random_uuid();
  v_test_email TEXT := 'test_' || substr(v_test_user_id::text, 1, 8) || '@test.com';
  v_points_after INTEGER;
  v_bonus_recorded BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 TESTING SIGNUP BONUS TRIGGER';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Creating test user: %', v_test_email;

  -- Create test user (trigger should fire)
  INSERT INTO users (id, email, username, full_name)
  VALUES (v_test_user_id, v_test_email, 'testuser', 'Test User');

  -- Wait a moment
  PERFORM pg_sleep(0.5);

  -- Check if points were awarded
  SELECT points_balance INTO v_points_after
  FROM users
  WHERE id = v_test_user_id;

  -- Check if bonus was recorded
  SELECT EXISTS (
    SELECT 1 FROM signup_bonus_history WHERE user_id = v_test_user_id
  ) INTO v_bonus_recorded;

  RAISE NOTICE '';
  RAISE NOTICE 'RESULTS:';
  RAISE NOTICE '  Points awarded: %', v_points_after;
  RAISE NOTICE '  Bonus recorded: %', v_bonus_recorded;
  RAISE NOTICE '';

  IF v_points_after > 0 AND v_bonus_recorded THEN
    RAISE NOTICE '✅ SUCCESS: Signup bonus is working!';
  ELSE
    RAISE NOTICE '❌ FAILED: Signup bonus did NOT work';
    IF v_points_after = 0 THEN
      RAISE NOTICE '   - No points were awarded';
    END IF;
    IF NOT v_bonus_recorded THEN
      RAISE NOTICE '   - No bonus record was created';
    END IF;
  END IF;

  -- Clean up test user
  DELETE FROM users WHERE id = v_test_user_id;
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Test user cleaned up';
  RAISE NOTICE '';
END $$;

-- 5. Summary
SELECT '✅ SIGNUP BONUS TEST COMPLETE' as status;
