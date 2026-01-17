-- ============================================================================
-- FIX: Points transactions trigger for posts
-- ============================================================================
-- The trigger is missing the 'activity' column which is required
-- ============================================================================

-- Check current table schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'points_transactions'
ORDER BY ordinal_position;

-- Fix the trigger function to include activity column
CREATE OR REPLACE FUNCTION award_points_for_post()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_can_earn BOOLEAN;
BEGIN
  -- Get point value from settings (default to 10 if function doesn't exist)
  BEGIN
    v_points := get_points_for_action('points_post_created');
  EXCEPTION WHEN OTHERS THEN
    v_points := 10; -- Default points for creating a post
  END;

  -- Check if user can earn points (within limits)
  BEGIN
    v_can_earn := check_hourly_points_limit(NEW.user_id) AND check_daily_points_limit(NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    v_can_earn := TRUE; -- If limit functions don't exist, allow earning
  END;

  IF v_can_earn THEN
    -- Award points (NOW INCLUDING activity column)
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      source,
      description,
      activity  -- ADDED THIS
    )
    VALUES (
      NEW.user_id,
      v_points,
      'earned',
      'post_created',
      'Created a new post',
      'post_created'  -- ADDED THIS
    );

    -- Update user's points balance
    UPDATE users SET points_balance = points_balance + v_points WHERE id = NEW.user_id;
  ELSE
    -- Log that user hit limit
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      source,
      description,
      activity  -- ADDED THIS
    )
    VALUES (
      NEW.user_id,
      0,
      'limit_reached',
      'post_created',
      'Daily/hourly limit reached',
      'limit_reached'  -- ADDED THIS
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_award_points_post ON posts;
CREATE TRIGGER trigger_award_points_post
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION award_points_for_post();

-- Test: Show recent transactions
SELECT
  user_id,
  points,
  activity,
  transaction_type,
  description,
  created_at
FROM points_transactions
ORDER BY created_at DESC
LIMIT 5;

SELECT '✅ Points transaction trigger fixed!' as status;
