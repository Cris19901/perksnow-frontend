-- Membership/Subscription System Migration
-- This creates tables for managing user memberships and subscription plans

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_days INTEGER NOT NULL, -- Duration in days (30 for monthly, 365 for yearly)
  features JSONB, -- List of features included
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  payment_method TEXT,
  transaction_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_end_date ON user_subscriptions(end_date);

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Everyone can view subscription plans
CREATE POLICY "Anyone can view subscription plans" ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own subscriptions (for payment processing)
CREATE POLICY "Users can create own subscriptions" ON user_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT, INSERT ON user_subscriptions TO authenticated;

-- Create function to check active membership
CREATE OR REPLACE FUNCTION has_active_membership(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND end_date > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_active_membership TO authenticated;

-- Create function to update subscription status (run daily via cron)
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE user_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, duration_days, features) VALUES
  (
    'Basic Monthly',
    'Basic membership plan with essential features',
    999.00,
    30,
    '["Access to all content", "Earn points from activities", "Basic support"]'::jsonb
  ),
  (
    'Premium Monthly',
    'Premium membership with all features unlocked',
    1999.00,
    30,
    '["Access to all content", "Earn points from activities", "Priority support", "Withdraw points to cash", "Exclusive badges", "Ad-free experience"]'::jsonb
  ),
  (
    'Premium Yearly',
    'Premium membership - annual plan (2 months free)',
    19990.00,
    365,
    '["Access to all content", "Earn points from activities", "Priority support", "Withdraw points to cash", "Exclusive badges", "Ad-free experience", "20% discount"]'::jsonb
  )
ON CONFLICT DO NOTHING;
