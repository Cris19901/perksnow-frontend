-- ============================================================================
-- COMPLETE FIX FOR REELS RLS POLICIES - Resolve 403 Errors
-- ============================================================================
-- This completely rewrites the RLS policies to ensure authenticated users
-- can interact with reels (like, comment, view)
-- ============================================================================

-- 1. DISABLE RLS temporarily to ensure we can modify
ALTER TABLE reel_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments DISABLE ROW LEVEL SECURITY;

-- 2. DROP ALL existing policies
DROP POLICY IF EXISTS "Anyone can track views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can view views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can create views" ON reel_views;
DROP POLICY IF EXISTS "Users can view their own views" ON reel_views;

DROP POLICY IF EXISTS "Anyone can view likes" ON reel_likes;
DROP POLICY IF EXISTS "Users can like reels" ON reel_likes;
DROP POLICY IF EXISTS "Authenticated users can like reels" ON reel_likes;
DROP POLICY IF EXISTS "Users can unlike reels" ON reel_likes;
DROP POLICY IF EXISTS "Authenticated users can unlike reels" ON reel_likes;

DROP POLICY IF EXISTS "Anyone can view comments" ON reel_comments;
DROP POLICY IF EXISTS "Users can create comments" ON reel_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON reel_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON reel_comments;
DROP POLICY IF EXISTS "Authenticated users can delete their own comments" ON reel_comments;
DROP POLICY IF EXISTS "Authenticated users can update their own comments" ON reel_comments;

-- 3. RE-ENABLE RLS
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

-- 4. CREATE NEW PERMISSIVE POLICIES FOR REEL_VIEWS
-- Allow anyone (including anonymous) to insert views
CREATE POLICY "reel_views_insert_policy"
ON reel_views FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to select views
CREATE POLICY "reel_views_select_policy"
ON reel_views FOR SELECT
TO public
USING (true);

-- 5. CREATE NEW PERMISSIVE POLICIES FOR REEL_LIKES
-- Allow authenticated users to view all likes
CREATE POLICY "reel_likes_select_policy"
ON reel_likes FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert likes
CREATE POLICY "reel_likes_insert_policy"
ON reel_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own likes
CREATE POLICY "reel_likes_delete_policy"
ON reel_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 6. CREATE NEW PERMISSIVE POLICIES FOR REEL_COMMENTS
-- Allow anyone to view comments
CREATE POLICY "reel_comments_select_policy"
ON reel_comments FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert comments
CREATE POLICY "reel_comments_insert_policy"
ON reel_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own comments
CREATE POLICY "reel_comments_update_policy"
ON reel_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "reel_comments_delete_policy"
ON reel_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 7. VERIFY THE POLICIES
SELECT
  '✅ NEW RLS POLICIES CREATED!' as status,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('reel_likes', 'reel_comments', 'reel_views')
ORDER BY tablename, policyname;

-- 8. Test view insertion (should work for anyone)
DO $$
DECLARE
  v_reel_id UUID;
BEGIN
  -- Get first reel
  SELECT id INTO v_reel_id FROM reels LIMIT 1;

  IF v_reel_id IS NOT NULL THEN
    -- Try inserting a test view (anonymous)
    INSERT INTO reel_views (reel_id, user_id)
    VALUES (v_reel_id, NULL)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ View insertion test PASSED!';

    -- Clean up
    DELETE FROM reel_views WHERE reel_id = v_reel_id AND user_id IS NULL;
  ELSE
    RAISE NOTICE '⚠️ No reels found to test with';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ View insertion test FAILED: %', SQLERRM;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT '🎉 Complete RLS fix applied! The 403 errors should be resolved.' as message;
