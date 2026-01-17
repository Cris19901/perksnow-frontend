-- ============================================================================
-- VERIFY REELS SYSTEM SETUP
-- ============================================================================
-- Run this to check if the reels system is properly set up
-- ============================================================================

-- Check 1: Does reel_likes table exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reel_likes'
  ) THEN
    RAISE NOTICE '✅ reel_likes table EXISTS';
  ELSE
    RAISE NOTICE '❌ reel_likes table DOES NOT EXIST';
  END IF;
END $$;

-- Check 2: Does reel_comments table exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reel_comments'
  ) THEN
    RAISE NOTICE '✅ reel_comments table EXISTS';
  ELSE
    RAISE NOTICE '❌ reel_comments table DOES NOT EXIST';
  END IF;
END $$;

-- Check 3: Does reel_views table exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'reel_views'
  ) THEN
    RAISE NOTICE '✅ reel_views table EXISTS';
  ELSE
    RAISE NOTICE '❌ reel_views table DOES NOT EXIST';
  END IF;
END $$;

-- Check 4: Does get_reels_feed function exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_reels_feed'
  ) THEN
    RAISE NOTICE '✅ get_reels_feed function EXISTS';
  ELSE
    RAISE NOTICE '❌ get_reels_feed function DOES NOT EXIST';
  END IF;
END $$;

-- Check 5: View RLS policies on reel_likes
SELECT
  '🔒 RLS Policies on reel_likes:' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'reel_likes';

-- Check 6: View RLS policies on reel_comments
SELECT
  '🔒 RLS Policies on reel_comments:' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'reel_comments';

-- Check 7: Count existing reels
SELECT COUNT(*) as total_reels FROM reels;

-- Check 8: Count reel likes
SELECT COUNT(*) as total_reel_likes FROM reel_likes;

-- Check 9: Count reel comments
SELECT COUNT(*) as total_reel_comments FROM reel_comments;

-- Check 10: Test get_reels_feed function (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_reels_feed') THEN
    RAISE NOTICE '✅ Testing get_reels_feed function...';
    PERFORM get_reels_feed(NULL, 5, 0);
    RAISE NOTICE '✅ get_reels_feed function works!';
  ELSE
    RAISE NOTICE '❌ Cannot test get_reels_feed - function does not exist';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ get_reels_feed function exists but has errors: %', SQLERRM;
END $$;
