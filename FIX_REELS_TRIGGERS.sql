-- ========================================
-- FIX REELS POINTS TRIGGERS
-- ========================================
-- Error: null value in column "activity" of relation "points_transactions" violates not-null constraint
-- This updates the trigger functions to include the activity column
-- ========================================

-- Fix the award_points_for_reel_upload function
CREATE OR REPLACE FUNCTION award_points_for_reel_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 50 points for uploading a reel
  INSERT INTO points_transactions (
    user_id,
    points,
    activity,
    transaction_type,
    source,
    description
  )
  VALUES (
    NEW.user_id,
    50,
    'reel_created',        -- activity column (matches source)
    'earn',                -- Changed from 'earned' to 'earn'
    'reel_created',        -- source
    'Uploaded a new reel'  -- description
  );

  -- Update user's points balance
  UPDATE users
  SET points_balance = points_balance + 50
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (in case it needs to be updated)
DROP TRIGGER IF EXISTS trigger_award_points_reel_upload ON reels;
CREATE TRIGGER trigger_award_points_reel_upload
AFTER INSERT ON reels
FOR EACH ROW EXECUTE FUNCTION award_points_for_reel_upload();

-- ============================================
-- Fix the award_points_for_reel_like function
-- ============================================
CREATE OR REPLACE FUNCTION award_points_for_reel_like()
RETURNS TRIGGER AS $$
DECLARE
  reel_owner_id UUID;
BEGIN
  -- Get the reel owner's user_id
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;

  -- Award 2 points to the reel owner
  INSERT INTO points_transactions (
    user_id,
    points,
    activity,
    transaction_type,
    source,
    description
  )
  VALUES (
    reel_owner_id,
    2,
    'reel_like_received',        -- activity column
    'earn',                      -- Changed from 'earned' to 'earn'
    'reel_like_received',        -- source
    'Received a like on your reel'  -- description
  );

  -- Update user's points balance
  UPDATE users
  SET points_balance = points_balance + 2
  WHERE id = reel_owner_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_award_points_reel_like ON reel_likes;
CREATE TRIGGER trigger_award_points_reel_like
AFTER INSERT ON reel_likes
FOR EACH ROW EXECUTE FUNCTION award_points_for_reel_like();

-- ============================================
-- Fix the award_points_for_reel_views function
-- ============================================
CREATE OR REPLACE FUNCTION award_points_for_reel_views()
RETURNS TRIGGER AS $$
DECLARE
  reel_owner_id UUID;
  current_views INTEGER;
BEGIN
  -- Get the reel owner and current view count
  SELECT user_id, views_count INTO reel_owner_id, current_views
  FROM reels WHERE id = NEW.reel_id;

  -- Award bonus points at view milestones
  IF current_views = 100 THEN
    INSERT INTO points_transactions (
      user_id,
      points,
      activity,
      transaction_type,
      source,
      description
    )
    VALUES (
      reel_owner_id,
      50,
      'reel_milestone_100_views',
      'earn',
      'reel_milestone_100_views',
      'Your reel reached 100 views!'
    );
    UPDATE users SET points_balance = points_balance + 50 WHERE id = reel_owner_id;
  ELSIF current_views = 1000 THEN
    INSERT INTO points_transactions (
      user_id,
      points,
      activity,
      transaction_type,
      source,
      description
    )
    VALUES (
      reel_owner_id,
      200,
      'reel_milestone_1000_views',
      'earn',
      'reel_milestone_1000_views',
      'Your reel reached 1,000 views!'
    );
    UPDATE users SET points_balance = points_balance + 200 WHERE id = reel_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_award_points_reel_views ON reel_views;
CREATE TRIGGER trigger_award_points_reel_views
AFTER INSERT ON reel_views
FOR EACH ROW EXECUTE FUNCTION award_points_for_reel_views();

-- Verify the triggers exist
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('reels', 'reel_likes', 'reel_views')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
