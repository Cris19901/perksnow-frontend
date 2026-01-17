-- ============================================================================
-- COMMENTS SYSTEM MIGRATION
-- Description: Creates the comments system for posts with support for nested replies
-- ============================================================================

-- Drop existing objects if they exist (for clean reinstall)
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON post_comments;
DROP FUNCTION IF EXISTS update_post_comment_count();
DROP TABLE IF EXISTS post_comments CASCADE;

-- ============================================================================
-- CREATE COMMENTS TABLE
-- ============================================================================

CREATE TABLE post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding comments on a post
CREATE INDEX idx_post_comments_post_id ON post_comments(post_id);

-- Index for finding comments by a user
CREATE INDEX idx_post_comments_user_id ON post_comments(user_id);

-- Index for finding replies to a comment
CREATE INDEX idx_post_comments_parent_id ON post_comments(parent_comment_id);

-- Composite index for post comments ordered by creation date
CREATE INDEX idx_post_comments_post_created ON post_comments(post_id, created_at DESC);

-- Index for recent comments
CREATE INDEX idx_post_comments_created_at ON post_comments(created_at DESC);

-- ============================================================================
-- ADD COMMENTS_COUNT COLUMN (IF NOT EXISTS)
-- ============================================================================

-- Add comments_count to posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- CREATE TRIGGER FUNCTIONS TO UPDATE COUNTS
-- ============================================================================

-- Function to update post comment count (only counts top-level comments)
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only increment for top-level comments (no parent)
    IF NEW.parent_comment_id IS NULL THEN
      UPDATE posts
      SET comments_count = comments_count + 1
      WHERE id = NEW.post_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Only decrement for top-level comments (no parent)
    IF OLD.parent_comment_id IS NULL THEN
      UPDATE posts
      SET comments_count = GREATEST(0, comments_count - 1)
      WHERE id = OLD.post_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- ============================================================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIALIZE COUNTS FOR EXISTING DATA
-- ============================================================================

-- Update all posts' comment counts
UPDATE posts
SET comments_count = (
  SELECT COUNT(*)
  FROM post_comments
  WHERE post_comments.post_id = posts.id
  AND post_comments.parent_comment_id IS NULL
);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get comments for a post with user information
CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  comment_id UUID,
  post_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  parent_comment_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  reply_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as comment_id,
    c.post_id,
    c.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    c.parent_comment_id,
    c.content,
    c.created_at,
    c.updated_at,
    (
      SELECT COUNT(*)
      FROM post_comments replies
      WHERE replies.parent_comment_id = c.id
    ) as reply_count
  FROM post_comments c
  JOIN users u ON u.id = c.user_id
  WHERE c.post_id = p_post_id
  AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get replies for a comment
CREATE OR REPLACE FUNCTION get_comment_replies(
  p_comment_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  comment_id UUID,
  post_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  parent_comment_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as comment_id,
    c.post_id,
    c.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    c.parent_comment_id,
    c.content,
    c.created_at,
    c.updated_at
  FROM post_comments c
  JOIN users u ON u.id = c.user_id
  WHERE c.parent_comment_id = p_comment_id
  ORDER BY c.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count total comments (including replies) for a post
CREATE OR REPLACE FUNCTION count_total_post_comments(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM post_comments
    WHERE post_id = p_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on post_comments table
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comments
CREATE POLICY "Comments are viewable by everyone"
ON post_comments FOR SELECT
USING (true);

-- Policy: Authenticated users can add comments
CREATE POLICY "Authenticated users can add comments"
ON post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
ON post_comments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON post_comments FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON post_comments TO authenticated;

-- Grant access to anonymous users for SELECT only
GRANT SELECT ON post_comments TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_post_comments TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_comments TO anon;
GRANT EXECUTE ON FUNCTION get_comment_replies TO authenticated;
GRANT EXECUTE ON FUNCTION get_comment_replies TO anon;
GRANT EXECUTE ON FUNCTION count_total_post_comments TO authenticated;
GRANT EXECUTE ON FUNCTION count_total_post_comments TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify installation:
-- SELECT 'post_comments table created' as status;
-- SELECT COUNT(*) as comment_count FROM post_comments;

COMMENT ON TABLE post_comments IS 'Stores comments on posts with support for nested replies';
COMMENT ON COLUMN post_comments.parent_comment_id IS 'NULL for top-level comments, references another comment for replies';
COMMENT ON FUNCTION get_post_comments IS 'Get top-level comments for a post with user info and reply counts';
COMMENT ON FUNCTION get_comment_replies IS 'Get replies to a specific comment';
COMMENT ON FUNCTION count_total_post_comments IS 'Count all comments including replies for a post';
