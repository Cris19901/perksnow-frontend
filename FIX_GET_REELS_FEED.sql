-- ========================================
-- FIX FOR get_reels_feed FUNCTION
-- ========================================
-- Error: column reference "reel_id" is ambiguous
-- This happens when a column name exists in multiple tables
-- ========================================

-- Fix the get_reels_feed function to properly qualify column names
CREATE OR REPLACE FUNCTION public.get_reels_feed(
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  reel_id uuid,
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  video_url text,
  thumbnail_url text,
  caption text,
  duration integer,
  views_count integer,
  likes_count integer,
  comments_count integer,
  created_at timestamp with time zone,
  is_liked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id as reel_id,
    r.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    r.video_url,
    r.thumbnail_url,
    r.caption,
    r.duration,
    r.views_count,
    r.likes_count,
    r.comments_count,
    r.created_at,
    CASE
      WHEN p_user_id IS NULL THEN false
      ELSE EXISTS(
        SELECT 1 FROM reel_likes rl
        WHERE rl.reel_id = r.id
        AND rl.user_id = p_user_id
      )
    END as is_liked
  FROM reels r
  INNER JOIN users u ON u.id = r.user_id
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;

-- Verify the function was created successfully
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_reels_feed';
