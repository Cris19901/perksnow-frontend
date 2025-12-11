-- ========================================
-- FIX: Update function return types to match users table
-- ========================================
-- Error: Returned type text does not match expected type character varying
-- The users table has TEXT columns, not VARCHAR
-- ========================================

-- Drop and recreate get_stories_feed function with correct types
DROP FUNCTION IF EXISTS public.get_stories_feed(UUID);

CREATE OR REPLACE FUNCTION public.get_stories_feed(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  story_id UUID,
  user_id UUID,
  username TEXT,        -- Changed from VARCHAR to TEXT
  full_name TEXT,       -- Changed from VARCHAR to TEXT
  avatar_url TEXT,
  media_url TEXT,
  media_type VARCHAR,
  thumbnail_url TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  views_count INTEGER,
  is_viewed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS story_id,
    s.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    s.media_url,
    s.media_type,
    s.thumbnail_url,
    s.duration,
    s.created_at,
    s.expires_at,
    s.views_count,
    CASE
      WHEN p_user_id IS NOT NULL THEN EXISTS(
        SELECT 1 FROM story_views sv
        WHERE sv.story_id = s.id AND sv.user_id = p_user_id
      )
      ELSE false
    END AS is_viewed
  FROM stories s
  JOIN users u ON s.user_id = u.id
  WHERE s.expires_at > NOW()
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_user_stories function (already correct, but recreating for consistency)
DROP FUNCTION IF EXISTS public.get_user_stories(UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_user_stories(
  p_user_id UUID,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS TABLE (
  story_id UUID,
  media_url TEXT,
  media_type VARCHAR,
  thumbnail_url TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  views_count INTEGER,
  is_viewed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS story_id,
    s.media_url,
    s.media_type,
    s.thumbnail_url,
    s.duration,
    s.created_at,
    s.expires_at,
    s.views_count,
    CASE
      WHEN p_viewer_id IS NOT NULL THEN EXISTS(
        SELECT 1 FROM story_views sv
        WHERE sv.story_id = s.id AND sv.user_id = p_viewer_id
      )
      ELSE false
    END AS is_viewed
  FROM stories s
  WHERE s.user_id = p_user_id
    AND s.expires_at > NOW()
  ORDER BY s.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the functions exist
SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN ('get_stories_feed', 'get_user_stories')
ORDER BY proname;

SELECT '✅ Functions updated successfully with correct types!' AS status;
