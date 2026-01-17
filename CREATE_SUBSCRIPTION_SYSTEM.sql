-- ============================================================================
-- LavLay Subscription System - Complete Database Schema
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This creates all tables, functions, and policies for the subscription system
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- STEP 1: Add Subscription Fields to Users Table
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

COMMENT ON COLUMN users.subscription_tier IS 'Current subscription plan: free, pro';
COMMENT ON COLUMN users.subscription_status IS 'Subscription status: inactive, active, cancelled, expired';

-- ============================================================================
-- STEP 2: Create Subscription Plans Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- 'free', 'pro'
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing and features';

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order)
VALUES
(
  'free',
  'Free',
  'Basic access to LavLay - Start earning points today!',
  0,
  0,
  '{
    "can_post": true,
    "can_comment": true,
    "can_like": true,
    "can_follow": true,
    "can_create_reels": true,
    "can_view_reels": true
  }',
  '{
    "max_posts_per_day": 10,
    "max_reels_per_day": 3,
    "max_comments_per_day": 50,
    "can_withdraw": false,
    "verified_badge": false
  }',
  1
),
(
  'pro',
  'Pro',
  'Unlock withdrawals and premium features!',
  2000,
  20000,
  '{
    "can_post": true,
    "can_comment": true,
    "can_like": true,
    "can_follow": true,
    "can_create_reels": true,
    "can_view_reels": true,
    "can_withdraw": true,
    "priority_support": true,
    "verified_badge": true,
    "ad_free": true,
    "analytics": true
  }',
  '{
    "max_posts_per_day": 100,
    "max_reels_per_day": 50,
    "max_comments_per_day": 500,
    "can_withdraw": true,
    "min_withdrawal": 5000,
    "withdrawal_fee_percent": 2.5,
    "verified_badge": true
  }',
  2
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Create Subscriptions Table (Transaction History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  plan_name TEXT NOT NULL,

  -- Subscription details
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired, failed
  billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly'
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',

  -- Payment details
  payment_provider TEXT, -- 'paystack', 'flutterwave', 'opay'
  payment_reference TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  payment_url TEXT, -- URL to redirect user for payment

  -- Dates
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_reference ON subscriptions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

COMMENT ON TABLE subscriptions IS 'User subscription records with payment tracking';

-- ============================================================================
-- STEP 4: Create Payment Transactions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),

  -- Payment details
  provider TEXT NOT NULL, -- 'paystack', 'flutterwave', 'opay'
  reference TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'cancelled'

  -- Provider response
  provider_response JSONB,
  provider_transaction_id TEXT,

  -- Webhook data
  webhook_received_at TIMESTAMP,
  webhook_data JSONB,
  webhook_signature TEXT,

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

COMMENT ON TABLE payment_transactions IS 'All payment transactions with provider details';

-- ============================================================================
-- STEP 5: Create Helper Functions
-- ============================================================================

-- Function: Check if user can withdraw
CREATE OR REPLACE FUNCTION can_user_withdraw(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_withdraw BOOLEAN;
BEGIN
  SELECT
    subscription_tier = 'pro'
    AND subscription_status = 'active'
    AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
  INTO v_can_withdraw
  FROM users
  WHERE id = p_user_id;

  RETURN COALESCE(v_can_withdraw, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_withdraw IS 'Check if user has active Pro subscription for withdrawals';

-- Function: Get user subscription limits
CREATE OR REPLACE FUNCTION get_user_limits(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_limits JSONB;
BEGIN
  SELECT sp.limits
  INTO v_limits
  FROM users u
  JOIN subscription_plans sp ON sp.name = u.subscription_tier
  WHERE u.id = p_user_id;

  RETURN COALESCE(v_limits, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_limits IS 'Get subscription limits for a user';

-- Function: Get user features
CREATE OR REPLACE FUNCTION get_user_features(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_features JSONB;
BEGIN
  SELECT sp.features
  INTO v_features
  FROM users u
  JOIN subscription_plans sp ON sp.name = u.subscription_tier
  WHERE u.id = p_user_id;

  RETURN COALESCE(v_features, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_features IS 'Get subscription features for a user';

-- Function: Activate subscription after successful payment
CREATE OR REPLACE FUNCTION activate_subscription(
  p_subscription_id UUID,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_plan_name TEXT;
  v_billing_cycle TEXT;
  v_expires_at TIMESTAMP;
  v_current_expiry TIMESTAMP;
BEGIN
  -- Get subscription details
  SELECT user_id, plan_name, billing_cycle
  INTO v_user_id, v_plan_name, v_billing_cycle
  FROM subscriptions
  WHERE id = p_subscription_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  -- Get current expiry (for renewals)
  SELECT subscription_expires_at
  INTO v_current_expiry
  FROM users
  WHERE id = v_user_id;

  -- Calculate new expiry date
  IF v_current_expiry > NOW() THEN
    -- Extend existing subscription
    IF v_billing_cycle = 'monthly' THEN
      v_expires_at := v_current_expiry + INTERVAL '1 month';
    ELSIF v_billing_cycle = 'yearly' THEN
      v_expires_at := v_current_expiry + INTERVAL '1 year';
    END IF;
  ELSE
    -- New subscription
    IF v_billing_cycle = 'monthly' THEN
      v_expires_at := NOW() + INTERVAL '1 month';
    ELSIF v_billing_cycle = 'yearly' THEN
      v_expires_at := NOW() + INTERVAL '1 year';
    END IF;
  END IF;

  -- Update subscription record
  UPDATE subscriptions
  SET
    status = 'active',
    payment_status = 'success',
    started_at = NOW(),
    expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  -- Update user record
  UPDATE users
  SET
    subscription_tier = v_plan_name,
    subscription_status = 'active',
    subscription_started_at = NOW(),
    subscription_expires_at = v_expires_at
  WHERE id = v_user_id;

  -- Update payment transaction if reference provided
  IF p_payment_reference IS NOT NULL THEN
    UPDATE payment_transactions
    SET
      status = 'success',
      updated_at = NOW()
    WHERE reference = p_payment_reference;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_subscription IS 'Activate a subscription after successful payment';

-- Function: Cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update current active subscription
  UPDATE subscriptions
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'active';

  -- Update user record (keep access until expiry)
  UPDATE users
  SET
    subscription_status = 'cancelled'
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cancel_subscription IS 'Cancel user subscription (access remains until expiry)';

-- Function: Check and expire subscriptions (run daily)
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
  -- Update expired subscriptions
  UPDATE subscriptions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();

  -- Update users with expired subscriptions
  UPDATE users
  SET
    subscription_tier = 'free',
    subscription_status = 'inactive'
  WHERE subscription_status IN ('active', 'cancelled')
    AND subscription_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_subscriptions IS 'Expire subscriptions that have passed their expiry date';

-- Schedule daily check for expired subscriptions
SELECT cron.schedule(
  'expire-subscriptions-daily',
  '0 0 * * *', -- Midnight every day
  $$SELECT expire_subscriptions();$$
);

-- ============================================================================
-- STEP 6: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Subscription plans: Public read for active plans
CREATE POLICY "Anyone can view active subscription plans"
ON subscription_plans FOR SELECT
TO authenticated, anon
USING (is_active = true);

-- Subscription plans: Only admins can modify
CREATE POLICY "Only admins can modify subscription plans"
ON subscription_plans FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.is_admin = true
  )
);

-- Subscriptions: Users can view their own
CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Subscriptions: Users can create their own
CREATE POLICY "Users can create own subscriptions"
ON subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Subscriptions: Service role can manage all
CREATE POLICY "Service role can manage all subscriptions"
ON subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Payment transactions: Users can view their own
CREATE POLICY "Users can view own payment transactions"
ON payment_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Payment transactions: Users can create their own
CREATE POLICY "Users can create own payment transactions"
ON payment_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Payment transactions: Service role can manage all
CREATE POLICY "Service role can manage all payment transactions"
ON payment_transactions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- Grant usage on tables
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON subscription_plans TO authenticated, anon;
GRANT SELECT, INSERT ON subscriptions TO authenticated;
GRANT SELECT, INSERT ON payment_transactions TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION can_user_withdraw TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_limits TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_features TO authenticated, anon;
GRANT EXECUTE ON FUNCTION activate_subscription TO service_role;
GRANT EXECUTE ON FUNCTION cancel_subscription TO authenticated;

-- ============================================================================
-- STEP 8: Create Views for Easy Querying
-- ============================================================================

-- View: Active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  s.*,
  u.email,
  u.full_name,
  sp.display_name as plan_display_name
FROM subscriptions s
JOIN users u ON u.id = s.user_id
JOIN subscription_plans sp ON sp.id = s.plan_id
WHERE s.status = 'active';

-- View: User subscription details
CREATE OR REPLACE VIEW user_subscription_details AS
SELECT
  u.id as user_id,
  u.email,
  u.full_name,
  u.subscription_tier,
  u.subscription_status,
  u.subscription_expires_at,
  sp.display_name,
  sp.features,
  sp.limits,
  can_user_withdraw(u.id) as can_withdraw
FROM users u
LEFT JOIN subscription_plans sp ON sp.name = u.subscription_tier;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Subscription system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - subscription_plans (2 plans: Free, Pro)';
  RAISE NOTICE '  - subscriptions';
  RAISE NOTICE '  - payment_transactions';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - can_user_withdraw()';
  RAISE NOTICE '  - get_user_limits()';
  RAISE NOTICE '  - get_user_features()';
  RAISE NOTICE '  - activate_subscription()';
  RAISE NOTICE '  - cancel_subscription()';
  RAISE NOTICE '  - expire_subscriptions()';
  RAISE NOTICE '';
  RAISE NOTICE 'Cron jobs scheduled:';
  RAISE NOTICE '  - expire-subscriptions-daily (runs at midnight)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy Railway backend for payment webhooks';
  RAISE NOTICE '  2. Add payment provider API keys';
  RAISE NOTICE '  3. Create subscription UI in frontend';
  RAISE NOTICE '  4. Test payment flow';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to accept Pro subscriptions!';
END $$;
