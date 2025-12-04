-- ============================================
-- FIX REELS FEED FUNCTION
-- ============================================
-- This fixes the "column reference 'reel_id' is ambiguous" error
-- Run this in Supabase SQL Editor

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_reels_feed();

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_reels_feed()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  duration INTEGER,
  views_count INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.video_url,
    r.thumbnail_url,
    r.title,
    r.description,
    r.duration,
    r.views_count,
    r.likes_count,
    r.comments_count,
    r.shares_count,
    r.created_at,
    r.updated_at,
    u.username,
    u.full_name,
    u.avatar_url,
    EXISTS(
      SELECT 1
      FROM reel_likes rl
      WHERE rl.reel_id = r.id
      AND rl.user_id = auth.uid()
    ) as is_liked
  FROM reels r
  INNER JOIN users u ON u.id = r.user_id
  ORDER BY r.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_reels_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION get_reels_feed() TO anon;

-- ============================================
-- DONE!
-- ============================================
-- The Reels feed should now load without errors
