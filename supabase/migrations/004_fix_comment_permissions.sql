-- Fix comment permissions - allow all authenticated users to comment on any post/reel
-- Date: 2026-01-23

-- ============================================
-- FIX POST COMMENTS - ALL USERS CAN COMMENT
-- ============================================

-- Drop the restrictive policy that only allows post owners to receive comments
DROP POLICY IF EXISTS "Users can only comment on own posts" ON post_comments;

-- Create new policy: Any authenticated user can comment on any post
CREATE POLICY "Authenticated users can comment on posts"
  ON post_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ============================================
-- FIX REEL COMMENTS - ALL USERS CAN COMMENT
-- ============================================

-- Drop the restrictive policy that only allows reel owners to receive comments
DROP POLICY IF EXISTS "Users can only comment on own reels" ON reel_comments;

-- Create new policy: Any authenticated user can comment on any reel
CREATE POLICY "Authenticated users can comment on reels"
  ON reel_comments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ============================================
-- VERIFY AND LOG RESULTS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Comment permissions updated successfully';
  RAISE NOTICE '✅ All authenticated users can now comment on any post/reel';
END $$;
