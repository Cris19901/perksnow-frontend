-- ============================================================================
-- FIX REELS RLS POLICIES - Allow Authenticated Users
-- ============================================================================
-- This fixes the 403 Forbidden errors on reel likes, comments, and views
-- ============================================================================

-- 1. Drop and recreate reel_views policies (currently blocking)
DROP POLICY IF EXISTS "Anyone can create views" ON reel_views;
DROP POLICY IF EXISTS "Users can view their own views" ON reel_views;

-- Allow anyone (including anonymous) to track views
CREATE POLICY "Anyone can track views"
ON reel_views FOR INSERT
WITH CHECK (true);

-- Anyone can view the views
CREATE POLICY "Anyone can view views"
ON reel_views FOR SELECT
USING (true);

-- 2. Fix reel_likes policies - ensure authenticated users can insert
DROP POLICY IF EXISTS "Users can like reels" ON reel_likes;
DROP POLICY IF EXISTS "Users can unlike reels" ON reel_likes;

CREATE POLICY "Authenticated users can like reels"
ON reel_likes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can unlike reels"
ON reel_likes FOR DELETE
USING (auth.uid() = user_id);

-- 3. Fix reel_comments policies - ensure authenticated users can insert
DROP POLICY IF EXISTS "Users can create comments" ON reel_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON reel_comments;

CREATE POLICY "Authenticated users can create comments"
ON reel_comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own comments"
ON reel_comments FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own comments"
ON reel_comments FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Verify policies are created
SELECT
  '✅ RLS Policies Updated!' as status,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('reel_likes', 'reel_comments', 'reel_views')
ORDER BY tablename, policyname;

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT '🎉 Reels RLS policies fixed! Try liking/commenting now.' as message;
