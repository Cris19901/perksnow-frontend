-- Fix reference_id type casting in comment trigger functions
-- The error occurs because triggers are trying to insert text values into UUID columns
-- Date: 2026-01-24

-- Recreate award_points_for_comment_received function with proper UUID casting
CREATE OR REPLACE FUNCTION award_points_for_comment_received()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  post_owner_id uuid;
BEGIN
  -- Get the post owner's user_id
  SELECT user_id INTO post_owner_id
  FROM posts
  WHERE id = NEW.post_id
  LIMIT 1;

  -- Award points to the post owner (not the commenter)
  -- Only if the commenter is not the post owner
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      reference_type,
      reference_id,  -- This should be UUID
      description,
      created_at
    ) VALUES (
      post_owner_id,
      5,  -- 5 points for receiving a comment
      'earn',
      'comment_received',
      NEW.id::uuid,  -- Cast to UUID explicitly
      'Received a comment on your post',
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the comment insertion
    RAISE WARNING 'Error awarding points for comment: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate update_post_comment_count function (this one probably doesn't have the issue, but let's be safe)
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating comment count: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recreate update_reel_comments_count function
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels
    SET comments_count = comments_count + 1
    WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating reel comment count: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Also create a similar function for reel comments if it doesn't exist
CREATE OR REPLACE FUNCTION award_points_for_reel_comment_received()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  reel_owner_id uuid;
BEGIN
  -- Get the reel owner's user_id
  SELECT user_id INTO reel_owner_id
  FROM reels
  WHERE id = NEW.reel_id
  LIMIT 1;

  -- Award points to the reel owner (not the commenter)
  -- Only if the commenter is not the reel owner
  IF reel_owner_id IS NOT NULL AND reel_owner_id != NEW.user_id THEN
    INSERT INTO points_transactions (
      user_id,
      points,
      transaction_type,
      reference_type,
      reference_id,  -- This should be UUID
      description,
      created_at
    ) VALUES (
      reel_owner_id,
      5,  -- 5 points for receiving a comment
      'earn',
      'comment_received',
      NEW.id::uuid,  -- Cast to UUID explicitly
      'Received a comment on your reel',
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the comment insertion
    RAISE WARNING 'Error awarding points for reel comment: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate triggers if they don't exist
DROP TRIGGER IF EXISTS trigger_award_points_comment_received ON post_comments;
CREATE TRIGGER trigger_award_points_comment_received
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_comment_received();

DROP TRIGGER IF EXISTS trigger_award_points_reel_comment_received ON reel_comments;
CREATE TRIGGER trigger_award_points_reel_comment_received
  AFTER INSERT ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION award_points_for_reel_comment_received();

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed reference_id UUID casting in comment trigger functions';
END $$;
