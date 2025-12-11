-- ========================================
-- FIX REELS TABLE PERMISSIONS
-- ========================================
-- Error: permission denied for table reels
-- This grants proper permissions to authenticated users
-- ========================================

-- Grant SELECT, INSERT, UPDATE, DELETE on reels table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reels TO anon;

-- Grant SELECT, INSERT, UPDATE, DELETE on reel_likes table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reel_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reel_likes TO anon;

-- Grant SELECT, INSERT, UPDATE, DELETE on reel_comments table to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reel_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reel_comments TO anon;

-- Grant USAGE on sequences (for auto-incrementing IDs if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Enable Row Level Security (RLS) on reels table
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reels table

-- Policy: Anyone can view reels
DROP POLICY IF EXISTS "Reels are viewable by everyone" ON public.reels;
CREATE POLICY "Reels are viewable by everyone"
  ON public.reels
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own reels
DROP POLICY IF EXISTS "Users can insert their own reels" ON public.reels;
CREATE POLICY "Users can insert their own reels"
  ON public.reels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reels
DROP POLICY IF EXISTS "Users can update their own reels" ON public.reels;
CREATE POLICY "Users can update their own reels"
  ON public.reels
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own reels
DROP POLICY IF EXISTS "Users can delete their own reels" ON public.reels;
CREATE POLICY "Users can delete their own reels"
  ON public.reels
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for reel_likes table

-- Policy: Anyone can view likes
DROP POLICY IF EXISTS "Reel likes are viewable by everyone" ON public.reel_likes;
CREATE POLICY "Reel likes are viewable by everyone"
  ON public.reel_likes
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can like reels
DROP POLICY IF EXISTS "Users can like reels" ON public.reel_likes;
CREATE POLICY "Users can like reels"
  ON public.reel_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can unlike reels
DROP POLICY IF EXISTS "Users can unlike reels" ON public.reel_likes;
CREATE POLICY "Users can unlike reels"
  ON public.reel_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for reel_comments table

-- Policy: Anyone can view comments
DROP POLICY IF EXISTS "Reel comments are viewable by everyone" ON public.reel_comments;
CREATE POLICY "Reel comments are viewable by everyone"
  ON public.reel_comments
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can comment on reels
DROP POLICY IF EXISTS "Users can comment on reels" ON public.reel_comments;
CREATE POLICY "Users can comment on reels"
  ON public.reel_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON public.reel_comments;
CREATE POLICY "Users can update their own comments"
  ON public.reel_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.reel_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.reel_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Verify the permissions
SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('reels', 'reel_likes', 'reel_comments')
ORDER BY tablename;

-- Verify the policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('reels', 'reel_likes', 'reel_comments')
ORDER BY tablename, policyname;
