-- ============================================================================
-- FIX REELS ENGAGEMENT COUNTS
-- Ensures likes, comments, and shares are properly counted
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current trigger status
-- ============================================================================

SELECT 'Checking existing triggers on reel_likes...' as step;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'reel_likes';

SELECT 'Checking existing triggers on reel_comments...' as step;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'reel_comments';

-- ============================================================================
-- STEP 2: Drop existing triggers (if any) to recreate them properly
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_reel_likes_count ON reel_likes;
DROP TRIGGER IF EXISTS trigger_update_reel_comments_count ON reel_comments;
DROP TRIGGER IF EXISTS update_reel_likes_count_trigger ON reel_likes;
DROP TRIGGER IF EXISTS update_reel_comments_count_trigger ON reel_comments;

-- ============================================================================
-- STEP 3: Create/Replace the likes count update function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment likes_count
    UPDATE reels
    SET likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement likes_count (never below 0)
    UPDATE reels
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1)
    WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Create/Replace the comments count update function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comments_count
    UPDATE reels
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comments_count (never below 0)
    UPDATE reels
    SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1)
    WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Create the triggers
-- ============================================================================

CREATE TRIGGER trigger_update_reel_likes_count
  AFTER INSERT OR DELETE ON reel_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_likes_count();

CREATE TRIGGER trigger_update_reel_comments_count
  AFTER INSERT OR DELETE ON reel_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_reel_comments_count();

-- ============================================================================
-- STEP 6: Sync existing counts (in case they're out of sync)
-- ============================================================================

-- Update likes_count to match actual likes
UPDATE reels r
SET likes_count = (
  SELECT COUNT(*) FROM reel_likes rl WHERE rl.reel_id = r.id
);

-- Update comments_count to match actual comments
UPDATE reels r
SET comments_count = (
  SELECT COUNT(*) FROM reel_comments rc WHERE rc.reel_id = r.id
);

-- ============================================================================
-- STEP 7: Verify the fix
-- ============================================================================

SELECT 'Triggers after fix:' as status;
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('reel_likes', 'reel_comments');

SELECT 'Sample reel counts after sync:' as status;
SELECT id, likes_count, comments_count, views_count
FROM reels
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Reels engagement counts have been fixed!' as result;
