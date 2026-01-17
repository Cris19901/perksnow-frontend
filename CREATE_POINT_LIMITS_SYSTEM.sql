-- ============================================================================
-- POINT LIMITS SYSTEM MIGRATION
-- Description: Creates the hourly point earning limit system with admin controls
-- ============================================================================

-- Drop existing objects if they exist (for clean reinstall)
DROP TRIGGER IF EXISTS update_point_settings_updated_at_trigger ON point_settings;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS can_user_earn_points(UUID, INTEGER);
DROP FUNCTION IF EXISTS record_point_earning(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_user_hourly_points(UUID);
DROP FUNCTION IF EXISTS reset_hourly_point_tracking();
DROP TABLE IF EXISTS hourly_point_tracking CASCADE;
DROP TABLE IF EXISTS point_settings CASCADE;

-- ============================================================================
-- CREATE POINT SETTINGS TABLE
-- ============================================================================

CREATE TABLE point_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE HOURLY POINT TRACKING TABLE
-- ============================================================================

CREATE TABLE hourly_point_tracking (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_earned INTEGER NOT NULL CHECK (points_earned >= 0),
  earning_hour TIMESTAMP WITH TIME ZONE NOT NULL,
  activity_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for efficient querying
  CONSTRAINT unique_user_hour_activity UNIQUE(user_id, earning_hour, activity_type)
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for finding user's point history
CREATE INDEX idx_hourly_points_user_id ON hourly_point_tracking(user_id);

-- Index for finding points by hour
CREATE INDEX idx_hourly_points_hour ON hourly_point_tracking(earning_hour DESC);

-- Composite index for user and hour queries
CREATE INDEX idx_hourly_points_user_hour ON hourly_point_tracking(user_id, earning_hour DESC);

-- ============================================================================
-- INSERT DEFAULT SETTINGS
-- ============================================================================

-- Insert default hourly point limit (100 points per hour)
INSERT INTO point_settings (setting_key, setting_value, description)
VALUES
  ('hourly_point_limit', '100', 'Maximum points a user can earn per hour'),
  ('point_reset_enabled', 'true', 'Whether hourly point limits are enforced')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get current hour timestamp (truncated to hour)
CREATE OR REPLACE FUNCTION get_current_hour()
RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  RETURN date_trunc('hour', NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to get hourly point limit from settings
CREATE OR REPLACE FUNCTION get_hourly_point_limit()
RETURNS INTEGER AS $$
DECLARE
  limit_value TEXT;
BEGIN
  SELECT setting_value INTO limit_value
  FROM point_settings
  WHERE setting_key = 'hourly_point_limit';

  RETURN COALESCE(limit_value::INTEGER, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if point limits are enabled
CREATE OR REPLACE FUNCTION are_point_limits_enabled()
RETURNS BOOLEAN AS $$
DECLARE
  enabled_value TEXT;
BEGIN
  SELECT setting_value INTO enabled_value
  FROM point_settings
  WHERE setting_key = 'point_reset_enabled';

  RETURN COALESCE(enabled_value::BOOLEAN, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's points earned in current hour
CREATE OR REPLACE FUNCTION get_user_hourly_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
  total_points INTEGER;
BEGIN
  current_hour := get_current_hour();

  SELECT COALESCE(SUM(points_earned), 0) INTO total_points
  FROM hourly_point_tracking
  WHERE user_id = p_user_id
  AND earning_hour = current_hour;

  RETURN total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can earn points
CREATE OR REPLACE FUNCTION can_user_earn_points(p_user_id UUID, p_points_to_earn INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_points INTEGER;
  point_limit INTEGER;
  limits_enabled BOOLEAN;
BEGIN
  -- Check if limits are enabled
  limits_enabled := are_point_limits_enabled();

  -- If limits are disabled, always allow
  IF NOT limits_enabled THEN
    RETURN true;
  END IF;

  -- Get current hour's points
  current_points := get_user_hourly_points(p_user_id);

  -- Get the limit
  point_limit := get_hourly_point_limit();

  -- Check if user would exceed limit
  RETURN (current_points + p_points_to_earn) <= point_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record point earning
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
  -- Check if user can earn these points
  can_earn := can_user_earn_points(p_user_id, p_points);

  IF NOT can_earn THEN
    RETURN false;
  END IF;

  -- Get current hour
  current_hour := get_current_hour();

  -- Record the points
  INSERT INTO hourly_point_tracking (user_id, points_earned, earning_hour, activity_type)
  VALUES (p_user_id, p_points, current_hour, p_activity_type)
  ON CONFLICT (user_id, earning_hour, activity_type)
  DO UPDATE SET points_earned = hourly_point_tracking.points_earned + p_points;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's point earning details for current hour
CREATE OR REPLACE FUNCTION get_user_hourly_point_details(p_user_id UUID)
RETURNS TABLE (
  activity_type TEXT,
  points_earned INTEGER,
  earning_hour TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  current_hour := get_current_hour();

  RETURN QUERY
  SELECT
    hpt.activity_type,
    hpt.points_earned,
    hpt.earning_hour
  FROM hourly_point_tracking hpt
  WHERE hpt.user_id = p_user_id
  AND hpt.earning_hour = current_hour
  ORDER BY hpt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old tracking data (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_point_tracking()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM hourly_point_tracking
  WHERE earning_hour < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================================================

-- Trigger function already created in comments system, reuse if exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create trigger for point_settings
CREATE TRIGGER update_point_settings_updated_at_trigger
BEFORE UPDATE ON point_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_point_tracking ENABLE ROW LEVEL SECURITY;

-- Point Settings Policies (Admin only can modify, anyone can read)
CREATE POLICY "Point settings are viewable by everyone"
ON point_settings FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert point settings"
ON point_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can update point settings"
ON point_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete point settings"
ON point_settings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Hourly Point Tracking Policies
CREATE POLICY "Users can view their own point tracking"
ON hourly_point_tracking FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "System can insert point tracking"
ON hourly_point_tracking FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant access to authenticated users
GRANT SELECT ON point_settings TO authenticated;
GRANT SELECT ON hourly_point_tracking TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_current_hour TO authenticated;
GRANT EXECUTE ON FUNCTION get_hourly_point_limit TO authenticated;
GRANT EXECUTE ON FUNCTION are_point_limits_enabled TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_hourly_points TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_earn_points TO authenticated;
GRANT EXECUTE ON FUNCTION record_point_earning TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_hourly_point_details TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Uncomment to verify installation:
-- SELECT * FROM point_settings;
-- SELECT get_hourly_point_limit();
-- SELECT are_point_limits_enabled();

COMMENT ON TABLE point_settings IS 'Stores admin-configurable settings for point limits and rules';
COMMENT ON TABLE hourly_point_tracking IS 'Tracks points earned by users per hour for limit enforcement';
COMMENT ON FUNCTION get_hourly_point_limit IS 'Returns the current hourly point limit';
COMMENT ON FUNCTION can_user_earn_points IS 'Checks if user can earn specified points without exceeding hourly limit';
COMMENT ON FUNCTION record_point_earning IS 'Records point earning for a user and checks against limits';
COMMENT ON FUNCTION get_user_hourly_points IS 'Returns total points earned by user in current hour';
COMMENT ON FUNCTION get_user_hourly_point_details IS 'Returns detailed breakdown of points earned in current hour';
COMMENT ON FUNCTION cleanup_old_point_tracking IS 'Removes point tracking data older than 7 days';
