-- ============================================================================
-- DEBUG REELS INTERACTION ISSUES
-- ============================================================================
-- Run this to debug why likes/comments/shares don't work
-- ============================================================================

-- 1. Check if tables exist and have correct structure
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('reel_likes', 'reel_comments', 'reel_views')
ORDER BY table_name, ordinal_position;

-- 2. Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('reel_likes', 'reel_comments', 'reel_views', 'reels');

-- 3. List ALL RLS policies on reel tables
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
WHERE tablename IN ('reel_likes', 'reel_comments', 'reel_views', 'reels')
ORDER BY tablename, policyname;

-- 4. Check if get_reels_feed function exists and view its definition
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_reels_feed';

-- 5. Test inserting a like as the current user (this will show the actual error)
-- Replace 'YOUR_REEL_ID_HERE' with an actual reel ID from your database
DO $$
DECLARE
  v_reel_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get first reel ID
  SELECT id INTO v_reel_id FROM reels LIMIT 1;

  IF v_reel_id IS NULL THEN
    RAISE NOTICE '❌ No reels found in database. Create a reel first.';
  ELSIF v_user_id IS NULL THEN
    RAISE NOTICE '❌ No authenticated user. Run this query while logged in.';
  ELSE
    RAISE NOTICE '✅ Found reel_id: % and user_id: %', v_reel_id, v_user_id;

    -- Try to insert a like
    BEGIN
      INSERT INTO reel_likes (reel_id, user_id)
      VALUES (v_reel_id, v_user_id)
      ON CONFLICT (reel_id, user_id) DO NOTHING;

      RAISE NOTICE '✅ Successfully inserted like!';

      -- Clean up test like
      DELETE FROM reel_likes
      WHERE reel_id = v_reel_id AND user_id = v_user_id;

      RAISE NOTICE '✅ Test like removed. System is working!';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Error inserting like: %', SQLERRM;
    END;
  END IF;
END $$;

-- 6. Check if any reels exist
SELECT
  COUNT(*) as total_reels,
  COUNT(DISTINCT user_id) as unique_uploaders
FROM reels;

-- 7. Show sample reel data (if any)
SELECT
  id as reel_id,
  user_id,
  caption,
  views_count,
  likes_count,
  comments_count,
  created_at
FROM reels
ORDER BY created_at DESC
LIMIT 3;

-- 8. Check if there are any existing likes or comments
SELECT
  'reel_likes' as table_name,
  COUNT(*) as total_records
FROM reel_likes
UNION ALL
SELECT
  'reel_comments',
  COUNT(*)
FROM reel_comments
UNION ALL
SELECT
  'reel_views',
  COUNT(*)
FROM reel_views;
