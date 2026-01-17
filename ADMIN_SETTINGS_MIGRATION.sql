-- ============================================================================
-- ADMIN SETTINGS SYSTEM - Configurable Point Values
-- ============================================================================
-- This creates a system for admins to configure point values for different actions
-- ============================================================================

-- 1. Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_category TEXT NOT NULL, -- 'points', 'limits', 'features', etc.
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(setting_category);

-- 2. Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON app_settings;

-- Anyone can view settings (needed for point calculations)
CREATE POLICY "Anyone can view settings"
ON app_settings FOR SELECT
USING (true);

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
ON app_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- 3. Insert default point values
INSERT INTO app_settings (setting_key, setting_value, setting_category, description) VALUES
-- Point rewards for actions
('points_post_created', '{"value": 10}', 'points', 'Points earned for creating a post'),
('points_reel_created', '{"value": 50}', 'points', 'Points earned for uploading a reel'),
('points_product_created', '{"value": 30}', 'points', 'Points earned for listing a product'),
('points_comment_created', '{"value": 5}', 'points', 'Points earned for writing a comment'),
('points_like_received', '{"value": 2}', 'points', 'Points earned when your content gets liked'),
('points_follow_received', '{"value": 5}', 'points', 'Points earned when someone follows you'),
('points_reel_100_views', '{"value": 50}', 'points', 'Bonus points when reel reaches 100 views'),
('points_reel_500_views', '{"value": 100}', 'points', 'Bonus points when reel reaches 500 views'),
('points_reel_1000_views', '{"value": 200}', 'points', 'Bonus points when reel reaches 1000 views'),
('points_reel_5000_views', '{"value": 500}', 'points', 'Bonus points when reel reaches 5000 views'),

-- Daily/hourly limits
('points_daily_limit', '{"value": 500}', 'limits', 'Maximum points a user can earn per day'),
('points_hourly_limit', '{"value": 100}', 'limits', 'Maximum points a user can earn per hour'),

-- Conversion rates
('points_to_currency_rate', '{"value": 10}', 'conversion', 'Points needed to equal 1 unit of currency (10 points = 1 NGN)'),
('minimum_withdrawal_points', '{"value": 1000}', 'conversion', 'Minimum points required to request withdrawal'),
('minimum_withdrawal_amount', '{"value": 100}', 'conversion', 'Minimum currency amount for withdrawal (NGN)')

ON CONFLICT (setting_key) DO NOTHING;

-- 4. Function to get a setting value
CREATE OR REPLACE FUNCTION get_setting(p_setting_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT setting_value INTO v_value
  FROM app_settings
  WHERE setting_key = p_setting_key;

  RETURN v_value;
END;
$$;

-- 5. Function to update a setting
CREATE OR REPLACE FUNCTION update_setting(
  p_setting_key TEXT,
  p_setting_value JSONB,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM users
  WHERE id = p_user_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can update settings';
  END IF;

  -- Update the setting
  UPDATE app_settings
  SET
    setting_value = p_setting_value,
    updated_by = p_user_id,
    updated_at = NOW()
  WHERE setting_key = p_setting_key;

  RETURN true;
END;
$$;

-- 6. Function to get points value for an action
CREATE OR REPLACE FUNCTION get_points_for_action(p_action TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points INTEGER;
BEGIN
  SELECT (setting_value->>'value')::INTEGER INTO v_points
  FROM app_settings
  WHERE setting_key = p_action;

  RETURN COALESCE(v_points, 0);
END;
$$;

-- 7. Function to check if user has reached daily limit
CREATE OR REPLACE FUNCTION check_daily_points_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_daily_limit INTEGER;
  v_points_today INTEGER;
BEGIN
  -- Get daily limit
  SELECT (setting_value->>'value')::INTEGER INTO v_daily_limit
  FROM app_settings
  WHERE setting_key = 'points_daily_limit';

  -- Get points earned today
  SELECT COALESCE(SUM(points), 0) INTO v_points_today
  FROM points_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'earned'
    AND created_at >= CURRENT_DATE;

  -- Return true if under limit
  RETURN v_points_today < v_daily_limit;
END;
$$;

-- 8. Function to check if user has reached hourly limit
CREATE OR REPLACE FUNCTION check_hourly_points_limit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hourly_limit INTEGER;
  v_points_this_hour INTEGER;
BEGIN
  -- Get hourly limit
  SELECT (setting_value->>'value')::INTEGER INTO v_hourly_limit
  FROM app_settings
  WHERE setting_key = 'points_hourly_limit';

  -- Get points earned in the last hour
  SELECT COALESCE(SUM(points), 0) INTO v_points_this_hour
  FROM points_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'earned'
    AND created_at >= NOW() - INTERVAL '1 hour';

  -- Return true if under limit
  RETURN v_points_this_hour < v_hourly_limit;
END;
$$;

-- 9. Update triggers to use configurable point values
-- Example: Update post creation trigger
CREATE OR REPLACE FUNCTION award_points_for_post()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_can_earn BOOLEAN;
BEGIN
  -- Get point value from settings
  v_points := get_points_for_action('points_post_created');

  -- Check if user can earn points (within limits)
  v_can_earn := check_hourly_points_limit(NEW.user_id) AND check_daily_points_limit(NEW.user_id);

  IF v_can_earn THEN
    -- Award points
    INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
    VALUES (NEW.user_id, v_points, 'earned', 'post_created', 'Created a new post');

    -- Update user's points balance
    UPDATE users SET points_balance = points_balance + v_points WHERE id = NEW.user_id;
  ELSE
    -- Log that user hit limit
    INSERT INTO points_transactions (user_id, points, transaction_type, source, description)
    VALUES (NEW.user_id, 0, 'limit_reached', 'post_created', 'Daily/hourly limit reached');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_award_points_post ON posts;
CREATE TRIGGER trigger_award_points_post
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION award_points_for_post();

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'Admin settings system migration completed successfully!' as status;

-- View all settings
SELECT setting_key, setting_value, setting_category, description
FROM app_settings
ORDER BY setting_category, setting_key;
