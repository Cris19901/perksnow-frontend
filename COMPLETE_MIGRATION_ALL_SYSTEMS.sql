-- ============================================================================
-- COMPLETE MIGRATION - ALL SYSTEMS
-- Description: Consolidated migration for all LavLay features
-- Includes: Likes, Comments, Point Limits, and Onboarding systems
-- Run this ONCE in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE SHARED FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Create update_updated_at_column function (used by multiple systems)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: LIKES SYSTEM
-- ============================================================================

-- Create likes tables
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_post_like UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS product_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_product_like UNIQUE(product_id, user_id)
);

CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_reel_like UNIQUE(reel_id, user_id)
);

-- Create indexes for likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_product_id ON product_likes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_likes_user_id ON product_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON reel_likes(user_id);

-- Add likes_count columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'likes_count') THEN
    ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'likes_count') THEN
    ALTER TABLE products ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reels' AND column_name = 'likes_count') THEN
    ALTER TABLE reels ADD COLUMN likes_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Create like count update functions
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products SET likes_count = likes_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_reel_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET likes_count = likes_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for likes
DROP TRIGGER IF EXISTS update_post_like_count_trigger ON post_likes;
CREATE TRIGGER update_post_like_count_trigger
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

DROP TRIGGER IF EXISTS update_product_like_count_trigger ON product_likes;
CREATE TRIGGER update_product_like_count_trigger
AFTER INSERT OR DELETE ON product_likes
FOR EACH ROW EXECUTE FUNCTION update_product_like_count();

DROP TRIGGER IF EXISTS update_reel_like_count_trigger ON reel_likes;
CREATE TRIGGER update_reel_like_count_trigger
AFTER INSERT OR DELETE ON reel_likes
FOR EACH ROW EXECUTE FUNCTION update_reel_like_count();

-- Enable RLS for likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for likes
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON post_likes;
CREATE POLICY "Post likes are viewable by everyone" ON post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts" ON post_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Product likes are viewable by everyone" ON product_likes;
CREATE POLICY "Product likes are viewable by everyone" ON product_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like products" ON product_likes;
CREATE POLICY "Users can like products" ON product_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike products" ON product_likes;
CREATE POLICY "Users can unlike products" ON product_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reel likes are viewable by everyone" ON reel_likes;
CREATE POLICY "Reel likes are viewable by everyone" ON reel_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like reels" ON reel_likes;
CREATE POLICY "Users can like reels" ON reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike reels" ON reel_likes;
CREATE POLICY "Users can unlike reels" ON reel_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 3: COMMENTS SYSTEM
-- ============================================================================

-- Create comments table
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_created_at ON post_comments(created_at DESC);

-- Add comments_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'comments_count') THEN
    ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Create comment count update function
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.parent_comment_id IS NULL THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.parent_comment_id IS NULL THEN
      UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comments
DROP TRIGGER IF EXISTS update_post_comment_count_trigger ON post_comments;
CREATE TRIGGER update_post_comment_count_trigger
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Create updated_at trigger for comments
DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for comments
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON post_comments;
CREATE POLICY "Comments are viewable by everyone" ON post_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can add comments" ON post_comments;
CREATE POLICY "Authenticated users can add comments" ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON post_comments;
CREATE POLICY "Users can update their own comments" ON post_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON post_comments;
CREATE POLICY "Users can delete their own comments" ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- Create comment helper functions
CREATE OR REPLACE FUNCTION get_post_comments(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  comment_id UUID,
  post_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  parent_comment_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  reply_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as comment_id,
    c.post_id,
    c.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    c.parent_comment_id,
    c.content,
    c.created_at,
    c.updated_at,
    (SELECT COUNT(*) FROM post_comments replies WHERE replies.parent_comment_id = c.id) as reply_count
  FROM post_comments c
  JOIN users u ON u.id = c.user_id
  WHERE c.post_id = p_post_id AND c.parent_comment_id IS NULL
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_comment_replies(
  p_comment_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  comment_id UUID,
  post_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  parent_comment_id UUID,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as comment_id,
    c.post_id,
    c.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    c.parent_comment_id,
    c.content,
    c.created_at,
    c.updated_at
  FROM post_comments c
  JOIN users u ON u.id = c.user_id
  WHERE c.parent_comment_id = p_comment_id
  ORDER BY c.created_at ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: POINT LIMITS SYSTEM
-- ============================================================================

-- Create point settings table
CREATE TABLE IF NOT EXISTS point_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create hourly point tracking table
CREATE TABLE IF NOT EXISTS hourly_point_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
  earning_hour TIMESTAMP WITH TIME ZONE NOT NULL,
  activity_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_hour_activity UNIQUE(user_id, earning_hour, activity_type)
);

-- Create indexes for point tracking
CREATE INDEX IF NOT EXISTS idx_hourly_points_user_id ON hourly_point_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_hourly_points_hour ON hourly_point_tracking(earning_hour DESC);

-- Insert default point settings
INSERT INTO point_settings (setting_key, setting_value, description)
VALUES
  ('hourly_point_limit', '100', 'Maximum points a user can earn per hour'),
  ('point_reset_enabled', 'true', 'Whether hourly point limits are enforced')
ON CONFLICT (setting_key) DO NOTHING;

-- Create point tracking functions
CREATE OR REPLACE FUNCTION get_current_hour()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN date_trunc('hour', NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_hourly_point_limit()
RETURNS INTEGER AS $$
DECLARE
  limit_value TEXT;
BEGIN
  SELECT setting_value INTO limit_value FROM point_settings WHERE setting_key = 'hourly_point_limit';
  RETURN COALESCE(limit_value::INTEGER, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION are_point_limits_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  enabled_value TEXT;
BEGIN
  SELECT setting_value INTO enabled_value FROM point_settings WHERE setting_key = 'point_reset_enabled';
  RETURN COALESCE(enabled_value::BOOLEAN, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_hourly_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
  total_points INTEGER;
BEGIN
  current_hour := get_current_hour();
  SELECT COALESCE(SUM(points_earned), 0) INTO total_points
  FROM hourly_point_tracking
  WHERE user_id = p_user_id AND earning_hour = current_hour;
  RETURN total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_user_earn_points(p_user_id UUID, p_points_to_earn INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_points INTEGER;
  point_limit INTEGER;
  limits_enabled BOOLEAN;
BEGIN
  limits_enabled := are_point_limits_enabled();
  IF NOT limits_enabled THEN RETURN true; END IF;
  current_points := get_user_hourly_points(p_user_id);
  point_limit := get_hourly_point_limit();
  RETURN (current_points + p_points_to_earn) <= point_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_point_earning(
  p_user_id UUID,
  p_points INTEGER,
  p_activity_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
  can_earn BOOLEAN;
BEGIN
  can_earn := can_user_earn_points(p_user_id, p_points);
  IF NOT can_earn THEN RETURN false; END IF;
  current_hour := get_current_hour();
  INSERT INTO hourly_point_tracking (user_id, points_earned, earning_hour, activity_type)
  VALUES (p_user_id, p_points, current_hour, p_activity_type)
  ON CONFLICT (user_id, earning_hour, activity_type)
  DO UPDATE SET points_earned = hourly_point_tracking.points_earned + p_points;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS for point tables
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_point_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for point settings
DROP POLICY IF EXISTS "Point settings are viewable by everyone" ON point_settings;
CREATE POLICY "Point settings are viewable by everyone" ON point_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify point settings" ON point_settings;
CREATE POLICY "Only admins can modify point settings" ON point_settings FOR ALL
USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Create RLS policies for point tracking
DROP POLICY IF EXISTS "Users can view their own point tracking" ON hourly_point_tracking;
CREATE POLICY "Users can view their own point tracking" ON hourly_point_tracking FOR SELECT
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

DROP POLICY IF EXISTS "System can insert point tracking" ON hourly_point_tracking;
CREATE POLICY "System can insert point tracking" ON hourly_point_tracking FOR INSERT WITH CHECK (true);

-- Create updated_at trigger for point settings
DROP TRIGGER IF EXISTS update_point_settings_updated_at_trigger ON point_settings;
CREATE TRIGGER update_point_settings_updated_at_trigger
BEFORE UPDATE ON point_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 5: ONBOARDING SYSTEM
-- ============================================================================

-- Add onboarding columns to users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'onboarding_completed') THEN
    ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'background_image_url') THEN
    ALTER TABLE users ADD COLUMN background_image_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'location') THEN
    ALTER TABLE users ADD COLUMN location TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'interests') THEN
    ALTER TABLE users ADD COLUMN interests TEXT[];
  END IF;
END $$;

-- Create onboarding progress table
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  profile_picture_added BOOLEAN DEFAULT false,
  background_image_added BOOLEAN DEFAULT false,
  bio_added BOOLEAN DEFAULT false,
  location_added BOOLEAN DEFAULT false,
  interests_added BOOLEAN DEFAULT false,
  first_post_created BOOLEAN DEFAULT false,
  first_follow_completed BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  template_variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  send_delay_hours INTEGER DEFAULT 0 CHECK (send_delay_hours >= 0),
  description TEXT,
  category TEXT DEFAULT 'onboarding',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scheduled emails table
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for onboarding
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status, scheduled_for);

-- Create onboarding functions
CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(p_user_id UUID, p_step_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_onboarding_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

  CASE p_step_name
    WHEN 'profile_picture' THEN UPDATE user_onboarding_progress SET profile_picture_added = true WHERE user_id = p_user_id;
    WHEN 'background_image' THEN UPDATE user_onboarding_progress SET background_image_added = true WHERE user_id = p_user_id;
    WHEN 'bio' THEN UPDATE user_onboarding_progress SET bio_added = true WHERE user_id = p_user_id;
    WHEN 'location' THEN UPDATE user_onboarding_progress SET location_added = true WHERE user_id = p_user_id;
    WHEN 'interests' THEN UPDATE user_onboarding_progress SET interests_added = true WHERE user_id = p_user_id;
    WHEN 'first_post' THEN UPDATE user_onboarding_progress SET first_post_created = true WHERE user_id = p_user_id;
    WHEN 'first_follow' THEN UPDATE user_onboarding_progress SET first_follow_completed = true WHERE user_id = p_user_id;
  END CASE;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_onboarding_progress(p_user_id UUID)
RETURNS TABLE (
  profile_picture_added BOOLEAN,
  background_image_added BOOLEAN,
  bio_added BOOLEAN,
  location_added BOOLEAN,
  interests_added BOOLEAN,
  first_post_created BOOLEAN,
  first_follow_completed BOOLEAN,
  profile_completed BOOLEAN,
  onboarding_completed BOOLEAN,
  completion_percentage INTEGER
) AS $$
BEGIN
  INSERT INTO user_onboarding_progress (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
  SELECT
    p.profile_picture_added, p.background_image_added, p.bio_added, p.location_added,
    p.interests_added, p.first_post_created, p.first_follow_completed,
    p.profile_completed, p.onboarding_completed, p.completion_percentage
  FROM user_onboarding_progress p WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS for onboarding
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for onboarding
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON user_onboarding_progress;
CREATE POLICY "Users can view their own onboarding progress" ON user_onboarding_progress FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Email templates are viewable by everyone" ON email_templates;
CREATE POLICY "Email templates are viewable by everyone" ON email_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can view their own scheduled emails" ON scheduled_emails FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON post_likes, product_likes, reel_likes TO authenticated;
GRANT INSERT, DELETE ON post_likes, product_likes, reel_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON post_comments TO authenticated;
GRANT SELECT ON point_settings, hourly_point_tracking TO authenticated;
GRANT SELECT ON user_onboarding_progress, email_templates, scheduled_emails TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE 'Created: Likes system, Comments system, Point limits, Onboarding system';
END $$;
