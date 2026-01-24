-- Add grace period feature for expired subscriptions
-- Date: 2026-01-23

-- ============================================
-- 1. ADD GRACE PERIOD CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_grace_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier TEXT NOT NULL, -- 'daily', 'weekly', 'pro'
  grace_period_days INTEGER NOT NULL DEFAULT 3, -- Days of grace period
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_tier)
);

-- Insert default grace periods
INSERT INTO subscription_grace_periods (plan_tier, grace_period_days, enabled)
VALUES
  ('daily', 1, true),   -- 1 day grace for daily plans
  ('weekly', 2, true),  -- 2 days grace for weekly plans
  ('pro', 3, true)      -- 3 days grace for pro/monthly plans
ON CONFLICT (plan_tier) DO NOTHING;

-- ============================================
-- 2. ADD GRACE PERIOD FIELDS TO USERS TABLE
-- ============================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_in_grace_period BOOLEAN DEFAULT false;

-- ============================================
-- 3. CREATE FUNCTION TO CHECK GRACE PERIOD STATUS
-- ============================================

CREATE OR REPLACE FUNCTION check_subscription_with_grace(p_user_id UUID)
RETURNS TABLE (
  has_active_subscription BOOLEAN,
  subscription_tier TEXT,
  subscription_status TEXT,
  is_in_grace BOOLEAN,
  grace_ends_at TIMESTAMPTZ,
  days_left INTEGER
) AS $$
DECLARE
  v_user RECORD;
  v_grace_config RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get user subscription info
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'free'::TEXT, 'inactive'::TEXT, false, NULL::TIMESTAMPTZ, 0;
    RETURN;
  END IF;

  -- If subscription is active and not expired, no grace period needed
  IF v_user.subscription_status = 'active'
     AND v_user.subscription_tier != 'free'
     AND (v_user.subscription_expires_at IS NULL OR v_user.subscription_expires_at > v_now) THEN
    RETURN QUERY SELECT
      true,
      v_user.subscription_tier,
      v_user.subscription_status,
      false,
      NULL::TIMESTAMPTZ,
      EXTRACT(DAY FROM (v_user.subscription_expires_at - v_now))::INTEGER;
    RETURN;
  END IF;

  -- Check if subscription just expired and eligible for grace period
  IF v_user.subscription_tier != 'free'
     AND v_user.subscription_expires_at IS NOT NULL
     AND v_user.subscription_expires_at <= v_now THEN

    -- Get grace period configuration for this tier
    SELECT * INTO v_grace_config
    FROM subscription_grace_periods
    WHERE plan_tier = v_user.subscription_tier
    AND enabled = true;

    IF FOUND THEN
      DECLARE
        v_grace_end TIMESTAMPTZ;
        v_days_in_grace INTEGER;
      BEGIN
        -- Calculate when grace period ends
        v_grace_end := v_user.subscription_expires_at + (v_grace_config.grace_period_days || ' days')::INTERVAL;
        v_days_in_grace := EXTRACT(DAY FROM (v_grace_end - v_now))::INTEGER;

        -- If still within grace period
        IF v_now <= v_grace_end THEN
          RETURN QUERY SELECT
            true, -- Still has active features
            v_user.subscription_tier,
            'grace_period'::TEXT,
            true,
            v_grace_end,
            v_days_in_grace;
          RETURN;
        END IF;
      END;
    END IF;
  END IF;

  -- Subscription fully expired, no grace period
  RETURN QUERY SELECT
    false,
    'free'::TEXT,
    'inactive'::TEXT,
    false,
    NULL::TIMESTAMPTZ,
    0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE EXPIRE-SUBSCRIPTIONS FUNCTION TO RESPECT GRACE PERIOD
-- ============================================

-- This will be called by the expire-subscriptions Edge Function
CREATE OR REPLACE FUNCTION expire_subscriptions_with_grace()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  action TEXT
) AS $$
DECLARE
  v_user RECORD;
  v_grace_config RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Find all users with expired subscriptions
  FOR v_user IN
    SELECT u.id, u.username, u.subscription_tier, u.subscription_expires_at,
           u.grace_period_ends_at, u.is_in_grace_period
    FROM users u
    WHERE u.subscription_status = 'active'
      AND u.subscription_tier != 'free'
      AND u.subscription_expires_at <= v_now
  LOOP
    -- Get grace period config
    SELECT * INTO v_grace_config
    FROM subscription_grace_periods
    WHERE plan_tier = v_user.subscription_tier
    AND enabled = true;

    IF FOUND AND NOT v_user.is_in_grace_period THEN
      -- Enter grace period
      UPDATE users
      SET
        is_in_grace_period = true,
        grace_period_ends_at = v_user.subscription_expires_at + (v_grace_config.grace_period_days || ' days')::INTERVAL,
        updated_at = v_now
      WHERE id = v_user.id;

      RETURN QUERY SELECT v_user.id, v_user.username, 'entered_grace'::TEXT;

    ELSIF v_user.is_in_grace_period AND v_now > v_user.grace_period_ends_at THEN
      -- Grace period expired, downgrade to free
      UPDATE users
      SET
        subscription_tier = 'free',
        subscription_status = 'inactive',
        is_in_grace_period = false,
        grace_period_ends_at = NULL,
        updated_at = v_now
      WHERE id = v_user.id;

      -- Update subscription record
      UPDATE subscriptions
      SET
        status = 'expired',
        updated_at = v_now
      WHERE user_id = v_user.id
      AND status = 'active';

      RETURN QUERY SELECT v_user.id, v_user.username, 'fully_expired'::TEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. ENABLE RLS FOR GRACE PERIOD TABLE
-- ============================================

ALTER TABLE subscription_grace_periods ENABLE ROW LEVEL SECURITY;

-- Admin can manage grace periods
CREATE POLICY "Admins can manage grace periods"
  ON subscription_grace_periods
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Everyone can view grace period settings
CREATE POLICY "Anyone can view grace period settings"
  ON subscription_grace_periods
  FOR SELECT
  USING (true);

-- ============================================
-- 6. CREATE INDEX FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_grace_period
ON users(is_in_grace_period, grace_period_ends_at)
WHERE is_in_grace_period = true;

-- ============================================
-- 7. VERIFY AND LOG RESULTS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Grace period feature added successfully';
  RAISE NOTICE '✅ Default grace periods: Daily=1d, Weekly=2d, Pro=3d';
  RAISE NOTICE '✅ Users will maintain access during grace period';
END $$;
