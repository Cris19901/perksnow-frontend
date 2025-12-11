-- ========================================
-- RECREATE STORIES TABLE FROM SCRATCH
-- ========================================
-- This drops the incomplete stories table and recreates it
-- with all required columns
-- ========================================

-- Drop existing stories table and related objects
DROP TABLE IF EXISTS public.story_views CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP FUNCTION IF EXISTS public.get_stories_feed(UUID);
DROP FUNCTION IF EXISTS public.get_user_stories(UUID, UUID);
DROP FUNCTION IF EXISTS public.increment_story_views();
DROP FUNCTION IF EXISTS public.cleanup_expired_stories();

-- Create stories table with ALL required columns
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  views_count INTEGER DEFAULT 0
);

-- Create story_views table
CREATE TABLE public.story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- Create indexes
CREATE INDEX idx_stories_user_id ON public.stories(user_id);
CREATE INDEX idx_stories_created_at ON public.stories(created_at);
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX idx_story_views_user_id ON public.story_views(user_id);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stories TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.story_views TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.story_views TO anon;

-- RLS Policies for stories
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON public.stories;
CREATE POLICY "Stories are viewable by everyone"
  ON public.stories FOR SELECT
  USING (expires_at > NOW());

DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
CREATE POLICY "Users can insert their own stories"
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stories" ON public.stories;
CREATE POLICY "Users can update their own stories"
  ON public.stories FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for story_views
DROP POLICY IF EXISTS "Users can view their own story views" ON public.story_views;
CREATE POLICY "Users can view their own story views"
  ON public.story_views FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM stories WHERE id = story_id));

DROP POLICY IF EXISTS "System can insert story views" ON public.story_views;
CREATE POLICY "System can insert story views"
  ON public.story_views FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete their own views" ON public.story_views;
CREATE POLICY "Users can delete their own views"
  ON public.story_views FOR DELETE
  USING (auth.uid() = user_id);

-- Create get_stories_feed function
CREATE OR REPLACE FUNCTION public.get_stories_feed(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  story_id UUID,
  user_id UUID,
  username VARCHAR,
  full_name VARCHAR,
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

-- Create get_user_stories function
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

-- Create increment_story_views function
CREATE OR REPLACE FUNCTION increment_story_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories
  SET views_count = views_count + 1
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_increment_story_views ON story_views;
CREATE TRIGGER trigger_increment_story_views
AFTER INSERT ON story_views
FOR EACH ROW EXECUTE FUNCTION increment_story_views();

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_stories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stories WHERE expires_at <= NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify everything
SELECT '🎉 Stories table recreated successfully with all columns!' AS status;

-- Show all columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'stories'
ORDER BY ordinal_position;
