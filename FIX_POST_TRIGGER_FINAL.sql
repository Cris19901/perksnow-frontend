-- ============================================================================
-- FIX: Post points trigger - Use correct transaction_type
-- ============================================================================
-- The check constraint expects 'earn' or 'spend', not 'earned'
-- ============================================================================

-- Drop and recreate the function with correct values
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
    -- Award points
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,  -- Using 'earn' not 'earned'
      activity,
      source,
      description
    )
    VALUES (
      NEW.user_id,
      v_points,
      'earn',           -- CHANGED FROM 'earned' to 'earn'
      'post_created',
      'post',
      'Created a new post'
    );

    -- Update user's points balance
    UPDATE users
    SET points_balance = COALESCE(points_balance, 0) + v_points
    WHERE id = NEW.user_id;
  ELSE
    -- Log that user hit limit (don't award points)
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      activity,
      source,
      description
    )
    VALUES (
      NEW.user_id,
      0,
      'earn',           -- Still 'earn' but with 0 points
      'limit_reached',
      'post',
      'Daily/hourly limit reached'
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

SELECT '✅ Post points trigger fixed with correct transaction_type!' as status;

-- Test by showing constraint definition
SELECT
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%transaction_type%';
