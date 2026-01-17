-- ============================================================================
-- FIX BALANCE COLUMN ONLY
-- ============================================================================
-- This renames 'points' to 'points_balance' so the frontend can display it
-- ============================================================================

DO $$
BEGIN
  -- Check if 'points' column exists and needs renaming
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points'
  ) THEN
    -- Rename to points_balance
    ALTER TABLE users RENAME COLUMN points TO points_balance;
    RAISE NOTICE '✅ Renamed points column to points_balance';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'points_balance'
  ) THEN
    RAISE NOTICE '✅ points_balance column already exists - no changes needed';
  ELSE
    -- Neither exists, create points_balance
    ALTER TABLE users ADD COLUMN points_balance INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Created points_balance column';
  END IF;
END $$;

-- Ensure all users have points_balance initialized
UPDATE users SET points_balance = COALESCE(points_balance, 0) WHERE points_balance IS NULL;

-- ============================================================================
-- UPDATE SIGNUP BONUS TRIGGER TO USE points_balance
-- ============================================================================

DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_amount INTEGER;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get bonus settings
    SELECT bonus_amount, is_enabled INTO v_bonus_amount, v_is_enabled
    FROM signup_bonus_settings
    LIMIT 1;

    -- If no settings exist, use defaults
    IF v_bonus_amount IS NULL THEN
        v_bonus_amount := 100;
        v_is_enabled := true;
    END IF;

    IF v_is_enabled AND v_bonus_amount > 0 THEN
        -- Award points to user (using points_balance)
        UPDATE users
        SET points_balance = COALESCE(points_balance, 0) + v_bonus_amount
        WHERE id = NEW.id;

        -- Record in history
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_history') THEN
            INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
            VALUES (NEW.id, v_bonus_amount, false)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;

        RAISE NOTICE '✅ Signup bonus of % points awarded to user %', v_bonus_amount, NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;

CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

DO $$
BEGIN
  RAISE NOTICE '✅ Signup bonus trigger updated to use points_balance';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_column_name TEXT;
  v_user_count INTEGER;
  v_total_points INTEGER;
BEGIN
  -- Check which column exists
  SELECT column_name INTO v_column_name
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name IN ('points', 'points_balance')
  LIMIT 1;

  IF v_column_name = 'points_balance' THEN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '  ✅ BALANCE COLUMN FIX COMPLETED SUCCESSFULLY';
    RAISE NOTICE '════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Show user stats
    SELECT COUNT(*), COALESCE(SUM(points_balance), 0)
    INTO v_user_count, v_total_points
    FROM users;

    RAISE NOTICE '📊 User Stats:';
    RAISE NOTICE '   Total Users: %', v_user_count;
    RAISE NOTICE '   Total Points: %', v_total_points;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Refresh your app to see balance!';
  ELSE
    RAISE NOTICE '⚠️  Column still named: %', v_column_name;
  END IF;
END $$;

-- Show sample users
SELECT
  email,
  points_balance,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
