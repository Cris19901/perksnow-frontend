-- Complete subscription system setup
-- This handles both new installs and existing partial installs

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Add subscription columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
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

-- Insert/update default plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order)
VALUES
('free', 'Free', 'Basic access to LavLay - Start earning points today!', 0, 0,
  '{"can_post": true, "can_comment": true, "can_like": true, "can_follow": true}',
  '{"max_posts_per_day": 10, "max_reels_per_day": 3, "can_withdraw": false}', 1),
('pro', 'Pro', 'Unlock withdrawals and premium features!', 2000, 20000,
  '{"can_post": true, "can_withdraw": true, "verified_badge": true}',
  '{"max_posts_per_day": 100, "max_reels_per_day": 50, "can_withdraw": true}', 2)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  updated_at = NOW();

-- Create subscriptions table (drop and recreate to fix any issues)
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  billing_cycle TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_provider TEXT,
  payment_reference TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending',
  payment_url TEXT,
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  provider TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  provider_response JSONB,
  webhook_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);

-- Helper function: Check if user can withdraw
CREATE OR REPLACE FUNCTION can_user_withdraw(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND subscription_tier = 'pro'
    AND subscription_status = 'active'
    AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Get user limits
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

-- Helper function: Activate subscription
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
  SELECT user_id, plan_name, billing_cycle
  INTO v_user_id, v_plan_name, v_billing_cycle
  FROM subscriptions
  WHERE id = p_subscription_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  SELECT subscription_expires_at
  INTO v_current_expiry
  FROM users
  WHERE id = v_user_id;

  IF v_current_expiry > NOW() THEN
    IF v_billing_cycle = 'monthly' THEN
      v_expires_at := v_current_expiry + INTERVAL '1 month';
    ELSIF v_billing_cycle = 'yearly' THEN
      v_expires_at := v_current_expiry + INTERVAL '1 year';
    END IF;
  ELSE
    IF v_billing_cycle = 'monthly' THEN
      v_expires_at := NOW() + INTERVAL '1 month';
    ELSIF v_billing_cycle = 'yearly' THEN
      v_expires_at := NOW() + INTERVAL '1 year';
    END IF;
  END IF;

  UPDATE subscriptions
  SET
    status = 'active',
    payment_status = 'success',
    started_at = NOW(),
    expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  UPDATE users
  SET
    subscription_tier = v_plan_name,
    subscription_status = 'active',
    subscription_started_at = NOW(),
    subscription_expires_at = v_expires_at
  WHERE id = v_user_id;

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

-- Helper function: Cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE subscriptions
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status = 'active';

  UPDATE users
  SET
    subscription_status = 'cancelled'
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Expire subscriptions (run daily)
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE subscriptions
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND expires_at < NOW();

  UPDATE users
  SET
    subscription_tier = 'free',
    subscription_status = 'inactive'
  WHERE subscription_status IN ('active', 'cancelled')
    AND subscription_expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can view active plans" ON subscription_plans;
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can create own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can view own transactions" ON payment_transactions;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create RLS policies
CREATE POLICY "Anyone can view active plans"
ON subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view own subscriptions"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
ON subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions"
ON payment_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
ON payment_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON subscription_plans TO authenticated, anon;
GRANT SELECT, INSERT ON subscriptions TO authenticated;
GRANT SELECT, INSERT ON payment_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_withdraw TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_limits TO authenticated, anon;
GRANT EXECUTE ON FUNCTION activate_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_subscription TO authenticated;

-- Schedule daily expiration check (if not already scheduled)
DO $body$
BEGIN
  PERFORM cron.schedule(
    'expire-subscriptions-daily',
    '0 0 * * *',
    $sql$SELECT expire_subscriptions();$sql$
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $body$;
