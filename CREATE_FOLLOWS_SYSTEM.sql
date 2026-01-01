-- ============================================================================
-- FOLLOWS SYSTEM MIGRATION
-- Description: Creates the follows/friends system for user connections
-- ============================================================================

-- Drop existing objects if they exist (for clean reinstall)
DROP TRIGGER IF EXISTS update_follower_count_trigger ON follows;
DROP TRIGGER IF EXISTS update_following_count_trigger ON follows;
DROP FUNCTION IF EXISTS update_follower_count();
DROP FUNCTION IF EXISTS update_following_count();
DROP TABLE IF EXISTS follows CASCADE;

-- ============================================================================
-- CREATE FOLLOWS TABLE
-- ============================================================================

CREATE TABLE follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent self-following
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),

  -- Prevent duplicate follows
  CONSTRAINT unique_follow UNIQUE(follower_id, following_id)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding who a user is following
CREATE INDEX idx_follows_follower ON follows(follower_id);

-- Index for finding a user's followers
CREATE INDEX idx_follows_following ON follows(following_id);

-- Composite index for faster lookups
CREATE INDEX idx_follows_composite ON follows(follower_id, following_id);

-- Index for recent follows
CREATE INDEX idx_follows_created_at ON follows(created_at DESC);

-- ============================================================================
-- ADD FOLLOWER/FOLLOWING COUNT COLUMNS TO USERS TABLE (IF NOT EXISTS)
-- ============================================================================

-- Add followers_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'followers_count'
  ) THEN
    ALTER TABLE users ADD COLUMN followers_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add following_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'following_count'
  ) THEN
    ALTER TABLE users ADD COLUMN following_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- CREATE TRIGGER FUNCTIONS TO UPDATE COUNTS
-- ============================================================================

-- Function to update follower count
CREATE OR REPLACE FUNCTION update_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE users
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;

    -- Increment following count for the user doing the following
    UPDATE users
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE users
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.following_id;

    -- Decrement following count for the user doing the unfollowing
    UPDATE users
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_follower_count_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW
EXECUTE FUNCTION update_follower_count();

-- ============================================================================
-- INITIALIZE COUNTS FOR EXISTING DATA
-- ============================================================================

-- Update all users' follower counts
UPDATE users
SET followers_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.following_id = users.id
);

-- Update all users' following counts
UPDATE users
SET following_count = (
  SELECT COUNT(*)
  FROM follows
  WHERE follows.follower_id = users.id
);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get a user's followers
CREATE OR REPLACE FUNCTION get_user_followers(p_user_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  followers_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.followers_count,
    f.created_at
  FROM follows f
  JOIN users u ON u.id = f.follower_id
  WHERE f.following_id = p_user_id
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users a user is following
CREATE OR REPLACE FUNCTION get_user_following(p_user_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  followers_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.followers_count,
    f.created_at
  FROM follows f
  JOIN users u ON u.id = f.following_id
  WHERE f.follower_id = p_user_id
  ORDER BY f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is following another user
CREATE OR REPLACE FUNCTION is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = p_follower_id AND following_id = p_following_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on follows table
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view follows
CREATE POLICY "Follows are viewable by everyone"
ON follows FOR SELECT
USING (true);

-- Policy: Users can follow others
CREATE POLICY "Users can follow others"
ON follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

-- Policy: Users can unfollow
CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
USING (auth.uid() = follower_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON follows TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_user_followers TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_following TO authenticated;
GRANT EXECUTE ON FUNCTION is_following TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify installation:
-- SELECT 'follows table created' as status;
-- SELECT COUNT(*) as follow_count FROM follows;
-- SELECT username, followers_count, following_count FROM users ORDER BY followers_count DESC LIMIT 10;

COMMENT ON TABLE follows IS 'Stores user follow relationships';
COMMENT ON COLUMN follows.follower_id IS 'User who is following';
COMMENT ON COLUMN follows.following_id IS 'User being followed';
COMMENT ON FUNCTION get_user_followers IS 'Get list of users following a specific user';
COMMENT ON FUNCTION get_user_following IS 'Get list of users that a specific user is following';
COMMENT ON FUNCTION is_following IS 'Check if one user is following another';
