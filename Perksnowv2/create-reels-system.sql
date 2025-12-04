-- ============================================
-- REELS SYSTEM DATABASE SCHEMA
-- ============================================
-- This creates a TikTok/Instagram Reels-style video sharing system
-- with likes, comments, views tracking, and points integration

-- ============================================
-- 1. REELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration INTEGER, -- video duration in seconds
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);

-- ============================================
-- 2. REEL LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON reel_likes(user_id);

-- ============================================
-- 3. REEL COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON reel_comments(user_id);

-- ============================================
-- 4. REEL VIEWS TABLE (for tracking unique views)
-- ============================================
CREATE TABLE IF NOT EXISTS reel_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- null for anonymous views
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reel_views_reel_id ON reel_views(reel_id);

-- ============================================
-- 5. TRIGGER: UPDATE LIKES COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET likes_count = likes_count - 1 WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reel_likes_count ON reel_likes;
CREATE TRIGGER trigger_update_reel_likes_count
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_likes_count();

-- ============================================
-- 6. TRIGGER: UPDATE COMMENTS COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET comments_count = comments_count + 1 WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET comments_count = comments_count - 1 WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_reel_comments_count ON reel_comments;
CREATE TRIGGER trigger_update_reel_comments_count
AFTER INSERT OR DELETE ON reel_comments
FOR EACH ROW EXECUTE FUNCTION update_reel_comments_count();

-- ============================================
-- 7. TRIGGER: UPDATE VIEWS COUNT
-- ============================================
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

-- ============================================
-- 8. POINTS INTEGRATION: Award points for reel uploads
-- ============================================
CREATE OR REPLACE FUNCTION award_points_for_reel_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 50 points for uploading a reel
  INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
  VALUES (NEW.user_id, 50, 'earned', 'reel_created', 'Uploaded a new reel');

  -- Update user's points balance
  UPDATE users SET points_balance = points_balance + 50 WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_points_reel_upload ON reels;
CREATE TRIGGER trigger_award_points_reel_upload
AFTER INSERT ON reels
FOR EACH ROW EXECUTE FUNCTION award_points_for_reel_upload();

-- ============================================
-- 9. POINTS INTEGRATION: Award points for reel likes
-- ============================================
CREATE OR REPLACE FUNCTION award_points_for_reel_like()
RETURNS TRIGGER AS $$
DECLARE
  reel_owner_id UUID;
BEGIN
  -- Get the reel owner's user_id
  SELECT user_id INTO reel_owner_id FROM reels WHERE id = NEW.reel_id;

  -- Award 2 points to the reel owner
  INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
  VALUES (reel_owner_id, 2, 'earned', 'reel_like_received', 'Received a like on your reel');

  -- Update user's points balance
  UPDATE users SET points_balance = points_balance + 2 WHERE id = reel_owner_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_points_reel_like ON reel_likes;
CREATE TRIGGER trigger_award_points_reel_like
AFTER INSERT ON reel_likes
FOR EACH ROW EXECUTE FUNCTION award_points_for_reel_like();

-- ============================================
-- 10. POINTS INTEGRATION: Award points for reel views (milestone-based)
-- ============================================
CREATE OR REPLACE FUNCTION award_points_for_reel_views()
RETURNS TRIGGER AS $$
DECLARE
  reel_owner_id UUID;
  current_views INTEGER;
BEGIN
  -- Get the reel owner and current view count
  SELECT user_id, views_count INTO reel_owner_id, current_views
  FROM reels WHERE id = NEW.reel_id;

  -- Award bonus points at view milestones
  IF current_views = 100 THEN
    INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
    VALUES (reel_owner_id, 50, 'earned', 'reel_views_milestone', 'Your reel reached 100 views');
    UPDATE users SET points_balance = points_balance + 50 WHERE id = reel_owner_id;
  ELSIF current_views = 500 THEN
    INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
    VALUES (reel_owner_id, 100, 'earned', 'reel_views_milestone', 'Your reel reached 500 views');
    UPDATE users SET points_balance = points_balance + 100 WHERE id = reel_owner_id;
  ELSIF current_views = 1000 THEN
    INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
    VALUES (reel_owner_id, 200, 'earned', 'reel_views_milestone', 'Your reel reached 1000 views');
    UPDATE users SET points_balance = points_balance + 200 WHERE id = reel_owner_id;
  ELSIF current_views = 5000 THEN
    INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
    VALUES (reel_owner_id, 500, 'earned', 'reel_views_milestone', 'Your reel reached 5000 views');
    UPDATE users SET points_balance = points_balance + 500 WHERE id = reel_owner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_award_points_reel_views ON reel_views;
CREATE TRIGGER trigger_award_points_reel_views
AFTER INSERT ON reel_views
FOR EACH ROW EXECUTE FUNCTION award_points_for_reel_views();

-- ============================================
-- 11. RLS POLICIES FOR REELS
-- ============================================
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- Anyone can view reels
CREATE POLICY "Anyone can view reels"
ON reels FOR SELECT
USING (true);

-- Users can create their own reels
CREATE POLICY "Users can create their own reels"
ON reels FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reels
CREATE POLICY "Users can update their own reels"
ON reels FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own reels
CREATE POLICY "Users can delete their own reels"
ON reels FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 12. RLS POLICIES FOR REEL LIKES
-- ============================================
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes
CREATE POLICY "Anyone can view likes"
ON reel_likes FOR SELECT
USING (true);

-- Users can like reels
CREATE POLICY "Users can like reels"
ON reel_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike reels"
ON reel_likes FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 13. RLS POLICIES FOR REEL COMMENTS
-- ============================================
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments
CREATE POLICY "Anyone can view comments"
ON reel_comments FOR SELECT
USING (true);

-- Users can create comments
CREATE POLICY "Users can create comments"
ON reel_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON reel_comments FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 14. RLS POLICIES FOR REEL VIEWS
-- ============================================
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

-- Anyone can create views (including anonymous)
CREATE POLICY "Anyone can create views"
ON reel_views FOR INSERT
WITH CHECK (true);

-- Users can view their own view history
CREATE POLICY "Users can view their own views"
ON reel_views FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- 15. FUNCTION: Get reels feed (with user info)
-- ============================================
CREATE OR REPLACE FUNCTION get_reels_feed(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  reel_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  duration INTEGER,
  views_count INTEGER,
  likes_count INTEGER,
  comments_count INTEGER,
  created_at TIMESTAMPTZ,
  is_liked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
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
      WHEN p_user_id IS NOT NULL THEN EXISTS(
        SELECT 1 FROM reel_likes
        WHERE reel_id = r.id AND user_id = p_user_id
      )
      ELSE false
    END as is_liked
  FROM reels r
  JOIN users u ON r.user_id = u.id
  ORDER BY r.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DONE!
-- ============================================
-- To create storage bucket for reels, run in Supabase dashboard:
-- 1. Go to Storage
-- 2. Create new bucket named "reels"
-- 3. Make it public
-- 4. Set up CORS policy to allow video playback
