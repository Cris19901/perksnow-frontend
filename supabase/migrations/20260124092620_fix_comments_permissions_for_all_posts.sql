-- Fix comment permissions to allow all users to comment on any post/reel
-- Currently users can only comment on their own posts
-- This migration allows any authenticated user to comment on any post or reel
-- Date: 2026-01-24

-- Grant INSERT permission on post_comments to authenticated users
GRANT INSERT ON post_comments TO authenticated;

-- Grant INSERT permission on reel_comments to authenticated users
GRANT INSERT ON reel_comments TO authenticated;

-- Create policy to allow any authenticated user to insert comments on any post
DROP POLICY IF EXISTS "Users can insert comments on any post" ON post_comments;
CREATE POLICY "Users can insert comments on any post"
  ON post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow any authenticated user to insert comments on any reel
DROP POLICY IF EXISTS "Users can insert comments on any reel" ON reel_comments;
CREATE POLICY "Users can insert comments on any reel"
  ON reel_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Grant SELECT permission so users can read all comments
GRANT SELECT ON post_comments TO authenticated, anon;
GRANT SELECT ON reel_comments TO authenticated, anon;

-- Allow users to read all comments on posts
DROP POLICY IF EXISTS "Anyone can view post comments" ON post_comments;
CREATE POLICY "Anyone can view post comments"
  ON post_comments
  FOR SELECT
  TO public
  USING (true);

-- Allow users to read all comments on reels
DROP POLICY IF EXISTS "Anyone can view reel comments" ON reel_comments;
CREATE POLICY "Anyone can view reel comments"
  ON reel_comments
  FOR SELECT
  TO public
  USING (true);

-- Allow users to delete their own comments on posts
GRANT DELETE ON post_comments TO authenticated;
DROP POLICY IF EXISTS "Users can delete own post comments" ON post_comments;
CREATE POLICY "Users can delete own post comments"
  ON post_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to delete their own comments on reels
GRANT DELETE ON reel_comments TO authenticated;
DROP POLICY IF EXISTS "Users can delete own reel comments" ON reel_comments;
CREATE POLICY "Users can delete own reel comments"
  ON reel_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Comment permissions fixed - all users can now comment on any post/reel';
END $$;
