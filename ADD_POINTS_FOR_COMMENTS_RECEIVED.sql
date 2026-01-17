-- ============================================================================
-- ADD POINTS FOR COMMENTS RECEIVED
-- Description: Award points to post owners when someone comments on their post
-- ============================================================================

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_award_points_comment_received ON post_comments;
DROP FUNCTION IF EXISTS award_points_for_comment_received();

-- ============================================================================
-- CREATE FUNCTION: Award points when someone comments on your post
-- ============================================================================

CREATE OR REPLACE FUNCTION award_points_for_comment_received()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner's user_id
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Only award points if comment is not from the post owner (don't reward self-comments)
  IF post_owner_id != NEW.user_id THEN
    -- Award 3 points to the post owner for receiving a comment
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      source,
      description,
      reference_id
    )
    VALUES (
      post_owner_id,
      3,
      'earned',
      'comment_received',
      'Someone commented on your post',
      NEW.id::text
    );

    -- Update user's points balance
    UPDATE users
    SET points_balance = points_balance + 3
    WHERE id = post_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGER: Award points when comment is created
-- ============================================================================

CREATE TRIGGER trigger_award_points_comment_received
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION award_points_for_comment_received();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if trigger was created
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  '✅ Active' as status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_award_points_comment_received';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Points for Comments Received - INSTALLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Post owners now earn 3 points when someone comments';
  RAISE NOTICE 'Self-comments do not award points';
  RAISE NOTICE '========================================';
END $$;
