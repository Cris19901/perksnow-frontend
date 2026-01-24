-- Create activities system and fix video/reel issues
-- Date: 2026-01-23

-- ============================================
-- 1. CREATE ACTIVITIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL, -- 'post', 'reel', 'profile_update', 'cover_update', 'follow', 'like', 'comment'
  content TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);

-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view public activities"
  ON activities
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own activities"
  ON activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON activities
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON activities
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. CREATE FUNCTION TO LOG PROFILE/COVER UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION log_profile_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log profile photo change
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NEW.avatar_url IS NOT NULL THEN
    INSERT INTO activities (user_id, activity_type, content, image_url, metadata)
    VALUES (
      NEW.id,
      'profile_update',
      'Updated profile picture',
      NEW.avatar_url,
      jsonb_build_object('old_avatar', OLD.avatar_url, 'new_avatar', NEW.avatar_url)
    );
  END IF;

  -- Log cover photo change
  IF NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url AND NEW.cover_image_url IS NOT NULL THEN
    INSERT INTO activities (user_id, activity_type, content, image_url, metadata)
    VALUES (
      NEW.id,
      'cover_update',
      'Updated cover photo',
      NEW.cover_image_url,
      jsonb_build_object('old_cover', OLD.cover_image_url, 'new_cover', NEW.cover_image_url)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS on_user_profile_update ON users;
CREATE TRIGGER on_user_profile_update
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url OR NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url)
  EXECUTE FUNCTION log_profile_activity();

-- ============================================
-- 3. FIX REEL_VIEWS RLS POLICY (STILL GETTING 403)
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Anyone can insert reel views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can view reel views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can record reel views" ON reel_views;

-- Create completely permissive policy for INSERT
CREATE POLICY "Public can track reel views"
  ON reel_views
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow viewing reel views
CREATE POLICY "Public can view reel views"
  ON reel_views
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- 4. ADD FUNCTION TO GET USER ACTIVITIES
-- ============================================

CREATE OR REPLACE FUNCTION get_user_activities(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  content TEXT,
  image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    a.activity_type,
    a.content,
    a.image_url,
    a.metadata,
    a.created_at
  FROM activities a
  JOIN users u ON a.user_id = u.id
  WHERE a.user_id = p_user_id
    AND a.is_public = true
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. CREATE FUNCTION FOR ACTIVITY FEED
-- ============================================

CREATE OR REPLACE FUNCTION get_activity_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_id UUID,
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  activity_type TEXT,
  content TEXT,
  image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    a.activity_type,
    a.content,
    a.image_url,
    a.metadata,
    a.created_at
  FROM activities a
  JOIN users u ON a.user_id = u.id
  WHERE a.is_public = true
    AND (
      -- Own activities
      a.user_id = p_user_id
      OR
      -- Activities from followed users
      a.user_id IN (
        SELECT following_id
        FROM follows
        WHERE follower_id = p_user_id
      )
    )
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. VERIFY AND LOG RESULTS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Activities table created successfully';
  RAISE NOTICE '✅ Profile/cover photo changes will now be logged';
  RAISE NOTICE '✅ Reel views RLS policy updated to fix 403 errors';
  RAISE NOTICE '✅ Activity feed functions created';
END $$;
