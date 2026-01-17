-- ============================================
-- Multi-Image Posts System - Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create post_images table for multiple images per post
-- ============================================
CREATE TABLE IF NOT EXISTS post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INT NOT NULL,
  width INT,
  height INT,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id, image_order);
CREATE INDEX IF NOT EXISTS idx_post_images_created_at ON post_images(created_at DESC);

-- 2. Add images_count column to posts table
-- ============================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS images_count INT DEFAULT 0;

-- 3. Create function to update images_count
-- ============================================
CREATE OR REPLACE FUNCTION update_post_images_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts
    SET images_count = images_count + 1,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts
    SET images_count = GREATEST(0, images_count - 1),
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Create trigger to automatically update images_count
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_post_images_count ON post_images;

CREATE TRIGGER trigger_update_post_images_count
  AFTER INSERT OR DELETE ON post_images
  FOR EACH ROW
  EXECUTE FUNCTION update_post_images_count();

-- 5. Migrate existing single images to post_images table
-- ============================================
-- This will copy existing image_url from posts to post_images
-- Only for posts that have an image_url and don't already have entries in post_images
INSERT INTO post_images (post_id, image_url, image_order)
SELECT
  id as post_id,
  image_url,
  1 as image_order
FROM posts
WHERE image_url IS NOT NULL
  AND image_url != ''
  AND NOT EXISTS (
    SELECT 1 FROM post_images WHERE post_images.post_id = posts.id
  );

-- Update images_count for posts that have images
UPDATE posts
SET images_count = (
  SELECT COUNT(*)
  FROM post_images
  WHERE post_images.post_id = posts.id
)
WHERE EXISTS (
  SELECT 1 FROM post_images WHERE post_images.post_id = posts.id
);

-- 6. Create function to get post with images
-- ============================================
CREATE OR REPLACE FUNCTION get_post_with_images(p_post_id UUID)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  content TEXT,
  images_count INT,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  created_at TIMESTAMPTZ,
  image_url TEXT,
  image_order INT,
  width INT,
  height INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as post_id,
    p.user_id,
    p.content,
    p.images_count,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.created_at,
    pi.image_url,
    pi.image_order,
    pi.width,
    pi.height
  FROM posts p
  LEFT JOIN post_images pi ON p.id = pi.post_id
  WHERE p.id = p_post_id
  ORDER BY pi.image_order;
END;
$$;

-- 7. Create function to get feed posts with images
-- ============================================
CREATE OR REPLACE FUNCTION get_feed_posts_with_images(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT,
  subscription_status TEXT,
  subscription_expires_at TIMESTAMPTZ,
  content TEXT,
  images_count INT,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  created_at TIMESTAMPTZ,
  images JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as post_id,
    u.id as user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    u.subscription_tier,
    u.subscription_status,
    u.subscription_expires_at,
    p.content,
    p.images_count,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'url', pi.image_url,
            'order', pi.image_order,
            'width', pi.width,
            'height', pi.height,
            'alt', pi.alt_text
          ) ORDER BY pi.image_order
        )
        FROM post_images pi
        WHERE pi.post_id = p.id
      ),
      '[]'::jsonb
    ) as images
  FROM posts p
  JOIN users u ON p.user_id = u.id
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. Enable Row Level Security
-- ============================================
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_images
CREATE POLICY "Anyone can view post images"
  ON post_images FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert images for their own posts"
  ON post_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
        AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their own posts"
  ON post_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
        AND posts.user_id = auth.uid()
    )
  );

-- 9. Create indexes for better query performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_images_count ON posts(images_count) WHERE images_count > 0;
CREATE INDEX IF NOT EXISTS idx_posts_created_images ON posts(created_at DESC, images_count);

-- 10. Verification queries
-- ============================================
-- Check that table was created
SELECT
  'post_images' as table_name,
  COUNT(*) as row_count
FROM post_images;

-- Check posts with multiple images
SELECT
  COUNT(*) as total_posts,
  COUNT(CASE WHEN images_count > 1 THEN 1 END) as multi_image_posts,
  MAX(images_count) as max_images_per_post
FROM posts;

-- Check that functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'update_post_images_count',
  'get_post_with_images',
  'get_feed_posts_with_images'
)
ORDER BY routine_name;

-- Check trigger was created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_post_images_count';

-- ============================================
-- EXPECTED RESULTS:
-- 1. post_images table created with indexes
-- 2. images_count column added to posts
-- 3. Function to automatically update count
-- 4. Trigger to maintain count
-- 5. Existing images migrated to new table
-- 6. Helper functions for querying posts with images
-- 7. RLS policies enabled
-- ============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Multi-Image Posts System installed successfully!';
  RAISE NOTICE 'ℹ️  Existing single images have been migrated to post_images table.';
  RAISE NOTICE 'ℹ️  Posts can now support up to 10 images each.';
  RAISE NOTICE 'ℹ️  Next step: Update frontend components to support multi-image display.';
END $$;
