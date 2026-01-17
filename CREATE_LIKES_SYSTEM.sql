-- ============================================================================
-- LIKES SYSTEM MIGRATION
-- Description: Creates the likes system for posts, products, and reels
-- ============================================================================

-- Drop existing objects if they exist (for clean reinstall)
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON post_likes;
DROP TRIGGER IF EXISTS update_product_like_count_trigger ON product_likes;
DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON reel_likes;
DROP FUNCTION IF EXISTS update_post_like_count();
DROP FUNCTION IF EXISTS update_product_like_count();
DROP FUNCTION IF EXISTS update_reel_like_count();
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS product_likes CASCADE;
DROP TABLE IF EXISTS reel_likes CASCADE;

-- ============================================================================
-- CREATE LIKES TABLES
-- ============================================================================

-- Post Likes Table
CREATE TABLE post_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate likes
  CONSTRAINT unique_post_like UNIQUE(post_id, user_id)
);

-- Product Likes Table
CREATE TABLE product_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate likes
  CONSTRAINT unique_product_like UNIQUE(product_id, user_id)
);

-- Reel Likes Table
CREATE TABLE reel_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate likes
  CONSTRAINT unique_reel_like UNIQUE(reel_id, user_id)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Post Likes Indexes
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_composite ON post_likes(post_id, user_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at DESC);

-- Product Likes Indexes
CREATE INDEX idx_product_likes_product_id ON product_likes(product_id);
CREATE INDEX idx_product_likes_user_id ON product_likes(user_id);
CREATE INDEX idx_product_likes_composite ON product_likes(product_id, user_id);
CREATE INDEX idx_product_likes_created_at ON product_likes(created_at DESC);

-- Reel Likes Indexes
CREATE INDEX idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user_id ON reel_likes(user_id);
CREATE INDEX idx_reel_likes_composite ON reel_likes(reel_id, user_id);
CREATE INDEX idx_reel_likes_created_at ON reel_likes(created_at DESC);

-- ============================================================================
-- ADD LIKES_COUNT COLUMNS (IF NOT EXISTS)
-- ============================================================================

-- Add likes_count to posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add likes_count to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE products ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add likes_count to reels table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reels' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE reels ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- CREATE TRIGGER FUNCTIONS TO UPDATE COUNTS
-- ============================================================================

-- Function to update post like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like count
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count
    UPDATE posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update product like count
CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like count
    UPDATE products
    SET likes_count = likes_count + 1
    WHERE id = NEW.product_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count
    UPDATE products
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.product_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reel like count
CREATE OR REPLACE FUNCTION update_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment like count
    UPDATE reels
    SET likes_count = likes_count + 1
    WHERE id = NEW.reel_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement like count
    UPDATE reels
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.reel_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Post Likes Trigger
CREATE TRIGGER update_post_like_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Product Likes Trigger
CREATE TRIGGER update_product_like_count_trigger
AFTER INSERT OR DELETE ON product_likes
FOR EACH ROW
EXECUTE FUNCTION update_product_like_count();

-- Reel Likes Trigger
CREATE TRIGGER update_reel_like_count_trigger
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW
EXECUTE FUNCTION update_reel_like_count();

-- ============================================================================
-- INITIALIZE COUNTS FOR EXISTING DATA
-- ============================================================================

-- Update all posts' like counts
UPDATE posts
SET likes_count = (
  SELECT COUNT(*)
  FROM post_likes
  WHERE post_likes.post_id = posts.id
);

-- Update all products' like counts
UPDATE products
SET likes_count = (
  SELECT COUNT(*)
  FROM product_likes
  WHERE product_likes.product_id = products.id
);

-- Update all reels' like counts
UPDATE reels
SET likes_count = (
  SELECT COUNT(*)
  FROM reel_likes
  WHERE reel_likes.reel_id = reels.id
);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user liked a post
CREATE OR REPLACE FUNCTION has_user_liked_post(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM post_likes
    WHERE user_id = p_user_id AND post_id = p_post_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user liked a product
CREATE OR REPLACE FUNCTION has_user_liked_product(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM product_likes
    WHERE user_id = p_user_id AND product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user liked a reel
CREATE OR REPLACE FUNCTION has_user_liked_reel(p_user_id UUID, p_reel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM reel_likes
    WHERE user_id = p_user_id AND reel_id = p_reel_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who liked a post
CREATE OR REPLACE FUNCTION get_post_likes(p_post_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    pl.created_at
  FROM post_likes pl
  JOIN users u ON u.id = pl.user_id
  WHERE pl.post_id = p_post_id
  ORDER BY pl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who liked a product
CREATE OR REPLACE FUNCTION get_product_likes(p_product_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    pl.created_at
  FROM product_likes pl
  JOIN users u ON u.id = pl.user_id
  WHERE pl.product_id = p_product_id
  ORDER BY pl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who liked a reel
CREATE OR REPLACE FUNCTION get_reel_likes(p_reel_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    rl.created_at
  FROM reel_likes rl
  JOIN users u ON u.id = rl.user_id
  WHERE rl.reel_id = p_reel_id
  ORDER BY rl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all likes tables
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

-- Post Likes Policies
CREATE POLICY "Post likes are viewable by everyone"
ON post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like posts"
ON post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON post_likes FOR DELETE
USING (auth.uid() = user_id);

-- Product Likes Policies
CREATE POLICY "Product likes are viewable by everyone"
ON product_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like products"
ON product_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike products"
ON product_likes FOR DELETE
USING (auth.uid() = user_id);

-- Reel Likes Policies
CREATE POLICY "Reel likes are viewable by everyone"
ON reel_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like reels"
ON reel_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels"
ON reel_likes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON product_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON reel_likes TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION has_user_liked_post TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_liked_product TO authenticated;
GRANT EXECUTE ON FUNCTION has_user_liked_reel TO authenticated;
GRANT EXECUTE ON FUNCTION get_post_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_reel_likes TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify installation:
-- SELECT 'post_likes table created' as status;
-- SELECT 'product_likes table created' as status;
-- SELECT 'reel_likes table created' as status;

COMMENT ON TABLE post_likes IS 'Stores user likes for posts';
COMMENT ON TABLE product_likes IS 'Stores user likes for products';
COMMENT ON TABLE reel_likes IS 'Stores user likes for reels';
COMMENT ON FUNCTION has_user_liked_post IS 'Check if user has liked a specific post';
COMMENT ON FUNCTION has_user_liked_product IS 'Check if user has liked a specific product';
COMMENT ON FUNCTION has_user_liked_reel IS 'Check if user has liked a specific reel';
COMMENT ON FUNCTION get_post_likes IS 'Get list of users who liked a post';
COMMENT ON FUNCTION get_product_likes IS 'Get list of users who liked a product';
COMMENT ON FUNCTION get_reel_likes IS 'Get list of users who liked a reel';
