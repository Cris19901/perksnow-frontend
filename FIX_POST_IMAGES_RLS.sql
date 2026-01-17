-- ============================================
-- Fix post_images RLS Policies
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view post images" ON post_images;
DROP POLICY IF EXISTS "Users can insert images for their own posts" ON post_images;
DROP POLICY IF EXISTS "Users can delete images from their own posts" ON post_images;

-- Create more permissive SELECT policy for public access
-- This allows both authenticated users and anonymous users to view post images
CREATE POLICY "Public can view all post images"
  ON post_images FOR SELECT
  USING (true);

-- Allow authenticated users to insert images for their own posts
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

-- Allow users to update images on their own posts
CREATE POLICY "Users can update images on their own posts"
  ON post_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id
        AND posts.user_id = auth.uid()
    )
  );

-- Allow users to delete images from their own posts
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

-- Verify RLS is enabled
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- Test query to ensure it works
SELECT
  'RLS Policies Updated' as status,
  COUNT(*) as total_policies
FROM pg_policies
WHERE tablename = 'post_images';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ post_images RLS policies fixed!';
  RAISE NOTICE 'ℹ️  Public (authenticated and anonymous) can now view post images.';
  RAISE NOTICE 'ℹ️  Users can insert/update/delete images on their own posts.';
END $$;
