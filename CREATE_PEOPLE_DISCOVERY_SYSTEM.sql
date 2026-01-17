-- ============================================================================
-- People Discovery & Friends System - SQL Migration
-- ============================================================================
-- This creates the functionality for finding and viewing friends' profiles
-- ============================================================================

-- Function to get suggested users (users you don't follow yet)
CREATE OR REPLACE FUNCTION get_suggested_users(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  is_following BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.bio,
    COALESCE(follower_counts.count, 0)::INTEGER AS followers_count,
    COALESCE(following_counts.count, 0)::INTEGER AS following_count,
    EXISTS(
      SELECT 1
      FROM follows f
      WHERE f.follower_id = p_user_id
        AND f.following_id = u.id
    ) AS is_following
  FROM users u
  LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM follows
    GROUP BY following_id
  ) follower_counts ON u.id = follower_counts.following_id
  LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM follows
    GROUP BY follower_id
  ) following_counts ON u.id = following_counts.follower_id
  WHERE u.id != COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND NOT EXISTS (
      SELECT 1
      FROM follows f
      WHERE f.follower_id = p_user_id
        AND f.following_id = u.id
    )
  ORDER BY follower_counts.count DESC NULLS LAST, u.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- Add followers/following count columns to users (if not exist)
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- ============================================================================
-- Function to update follower/following counts
-- ============================================================================
CREATE OR REPLACE FUNCTION update_user_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE users
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

    -- Increment followers count for followed user
    UPDATE users
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE users
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;

    -- Decrement followers count for followed user
    UPDATE users
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.following_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Trigger to auto-update follow counts
-- ============================================================================
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON follows;
CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_user_follow_counts();

-- ============================================================================
-- Initialize existing counts (run once)
-- ============================================================================
UPDATE users u
SET
  followers_count = (
    SELECT COUNT(*)
    FROM follows f
    WHERE f.following_id = u.id
  ),
  following_count = (
    SELECT COUNT(*)
    FROM follows f
    WHERE f.follower_id = u.id
  );

-- ============================================================================
