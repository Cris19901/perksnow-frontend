-- ============================================
-- REELS SYSTEM DATABASE SETUP
-- ============================================
-- Run this in your Supabase SQL Editor to set up the Reels feature

-- 1. Create reels table
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  duration INTEGER, -- in seconds
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on reels table
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for reels
CREATE POLICY "Anyone can view reels" ON reels FOR SELECT USING (true);
CREATE POLICY "Users can create own reels" ON reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reels" ON reels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reels" ON reels FOR DELETE USING (auth.uid() = user_id);

-- 4. Create reel_likes table
CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

-- 5. Enable RLS on reel_likes table
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for reel_likes
CREATE POLICY "Anyone can view reel likes" ON reel_likes FOR SELECT USING (true);
CREATE POLICY "Users can like reels" ON reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON reel_likes FOR DELETE USING (auth.uid() = user_id);

-- 7. Create reel_comments table
CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable RLS on reel_comments table
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for reel_comments
CREATE POLICY "Anyone can view reel comments" ON reel_comments FOR SELECT USING (true);
CREATE POLICY "Users can create reel comments" ON reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reel comments" ON reel_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reel comments" ON reel_comments FOR DELETE USING (auth.uid() = user_id);

-- 10. Create reel_views table
CREATE TABLE IF NOT EXISTS reel_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

-- 11. Enable RLS on reel_views table
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for reel_views
CREATE POLICY "Anyone can view reel views" ON reel_views FOR SELECT USING (true);
CREATE POLICY "Anyone can record reel views" ON reel_views FOR INSERT WITH CHECK (true);

-- 13. Create function to increment reel likes count
CREATE OR REPLACE FUNCTION increment_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET likes_count = likes_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create trigger for reel likes
DROP TRIGGER IF EXISTS on_reel_like_added ON reel_likes;
CREATE TRIGGER on_reel_like_added
  AFTER INSERT ON reel_likes
  FOR EACH ROW EXECUTE FUNCTION increment_reel_likes_count();

-- 15. Create function to decrement reel likes count
CREATE OR REPLACE FUNCTION decrement_reel_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 16. Create trigger for reel unlikes
DROP TRIGGER IF EXISTS on_reel_like_removed ON reel_likes;
CREATE TRIGGER on_reel_like_removed
  AFTER DELETE ON reel_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_reel_likes_count();

-- 17. Create function to increment reel comments count
CREATE OR REPLACE FUNCTION increment_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET comments_count = comments_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 18. Create trigger for reel comments
DROP TRIGGER IF EXISTS on_reel_comment_added ON reel_comments;
CREATE TRIGGER on_reel_comment_added
  AFTER INSERT ON reel_comments
  FOR EACH ROW EXECUTE FUNCTION increment_reel_comments_count();

-- 19. Create function to decrement reel comments count
CREATE OR REPLACE FUNCTION decrement_reel_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET comments_count = GREATEST(0, comments_count - 1)
  WHERE id = OLD.reel_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 20. Create trigger for reel comment deletion
DROP TRIGGER IF EXISTS on_reel_comment_removed ON reel_comments;
CREATE TRIGGER on_reel_comment_removed
  AFTER DELETE ON reel_comments
  FOR EACH ROW EXECUTE FUNCTION decrement_reel_comments_count();

-- 21. Create function to increment reel views count
CREATE OR REPLACE FUNCTION increment_reel_views_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reels
  SET views_count = views_count + 1
  WHERE id = NEW.reel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 22. Create trigger for reel views
DROP TRIGGER IF EXISTS on_reel_view_added ON reel_views;
CREATE TRIGGER on_reel_view_added
  AFTER INSERT ON reel_views
  FOR EACH ROW EXECUTE FUNCTION increment_reel_views_count();

-- ============================================
-- DONE!
-- ============================================
-- After running this, the Reels feature will be fully functional
-- Users can upload videos, view reels, like, comment, and track views
