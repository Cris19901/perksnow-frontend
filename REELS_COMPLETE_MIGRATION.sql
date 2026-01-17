-- ============================================================================
-- COMPLETE REELS SYSTEM MIGRATION
-- ============================================================================
-- Run this in Supabase SQL Editor to fix reels like, comment, share issues
-- ============================================================================

-- 1. Ensure tables exist
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration INTEGER,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reel_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON reel_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON reel_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id ON reel_views(reel_id);

-- 3. Enable RLS
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view reels" ON reels;
DROP POLICY IF EXISTS "Users can create their own reels" ON reels;
DROP POLICY IF EXISTS "Users can update their own reels" ON reels;
DROP POLICY IF EXISTS "Users can delete their own reels" ON reels;

DROP POLICY IF EXISTS "Anyone can view likes" ON reel_likes;
DROP POLICY IF EXISTS "Users can like reels" ON reel_likes;
DROP POLICY IF EXISTS "Users can unlike reels" ON reel_likes;

DROP POLICY IF EXISTS "Anyone can view comments" ON reel_comments;
DROP POLICY IF EXISTS "Users can create comments" ON reel_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON reel_comments;

DROP POLICY IF EXISTS "Anyone can create views" ON reel_views;
DROP POLICY IF EXISTS "Users can view their own views" ON reel_views;

-- 5. Create RLS policies for reels
CREATE POLICY "Anyone can view reels"
ON reels FOR SELECT
USING (true);

CREATE POLICY "Users can create their own reels"
ON reels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reels"
ON reels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reels"
ON reels FOR DELETE
USING (auth.uid() = user_id);

-- 6. Create RLS policies for reel_likes
CREATE POLICY "Anyone can view likes"
ON reel_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like reels"
ON reel_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike reels"
ON reel_likes FOR DELETE
USING (auth.uid() = user_id);

-- 7. Create RLS policies for reel_comments
CREATE POLICY "Anyone can view comments"
ON reel_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON reel_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON reel_comments FOR DELETE
USING (auth.uid() = user_id);

-- 8. Create RLS policies for reel_views
CREATE POLICY "Anyone can create views"
ON reel_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own views"
ON reel_views FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- 9. Create/update triggers for counts
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reel_likes_count ON reel_likes;
CREATE TRIGGER trigger_update_reel_likes_count
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reel_comments_count ON reel_comments;
CREATE TRIGGER trigger_update_reel_comments_count
AFTER INSERT OR DELETE ON reel_comments
FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

CREATE OR REPLACE FUNCTION update_reel_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels SET views_count = views_count + 1 WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reel_views_count ON reel_views;
CREATE TRIGGER trigger_update_reel_views_count
AFTER INSERT ON reel_views
FOR EACH ROW EXECUTE FUNCTION update_reel_views_count();

-- 10. Create get_reels_feed function
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

-- ============================================================================
-- DONE! Test the setup
-- ============================================================================
SELECT 'Reels system migration completed successfully!' as status;
