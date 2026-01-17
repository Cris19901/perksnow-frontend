-- Add New Subscription Packages
-- Daily and Weekly plans for more flexibility

-- First, let's see current subscription plans
SELECT
    id,
    name,
    display_name,
    price_monthly,
    price_yearly,
    currency,
    sort_order,
    is_active
FROM subscription_plans
ORDER BY sort_order;

-- Add Daily Plan (₦200 for 1 day)
INSERT INTO subscription_plans (
    name,
    display_name,
    description,
    price_monthly,
    price_yearly,
    currency,
    features,
    limits,
    sort_order,
    is_active,
    billing_interval,
    billing_interval_count
) VALUES (
    'daily',
    'Daily Pass',
    'Perfect for trying out pro features for a day',
    200,  -- Daily price
    0,    -- No yearly option for daily
    'NGN',
    '{
        "ad_free": true,
        "priority_support": false,
        "trial": true
    }'::jsonb,
    '{
        "max_posts_per_day": 50,
        "max_reels_per_day": 20,
        "can_withdraw": true,
        "verified_badge": false,
        "duration_days": 1
    }'::jsonb,
    2,  -- Sort order (between free and weekly)
    true,
    'day',
    1
) ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    is_active = true;

-- Add Weekly Plan (₦1,000 for 1 week)
INSERT INTO subscription_plans (
    name,
    display_name,
    description,
    price_monthly,
    price_yearly,
    currency,
    features,
    limits,
    sort_order,
    is_active,
    billing_interval,
    billing_interval_count
) VALUES (
    'weekly',
    'Weekly',
    'Full pro access for one week',
    1000,  -- Weekly price
    0,     -- No yearly option for weekly
    'NGN',
    '{
        "ad_free": true,
        "priority_support": false
    }'::jsonb,
    '{
        "max_posts_per_day": -1,
        "max_reels_per_day": -1,
        "can_withdraw": true,
        "verified_badge": true,
        "duration_days": 7
    }'::jsonb,
    3,  -- Sort order (between daily and basic monthly)
    true,
    'week',
    1
) ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    is_active = true;

-- Update sort orders for existing plans to accommodate new ones
UPDATE subscription_plans SET sort_order = 1 WHERE name = 'free';
UPDATE subscription_plans SET sort_order = 4 WHERE name = 'basic';
UPDATE subscription_plans SET sort_order = 5 WHERE name = 'pro';

-- Show all plans with new additions
SELECT
    id,
    name,
    display_name,
    description,
    price_monthly,
    currency,
    sort_order,
    is_active,
    features,
    limits
FROM subscription_plans
ORDER BY sort_order;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ New subscription plans added!';
  RAISE NOTICE '✅ Daily (₦200) and Weekly (₦1,000) plans created';
  RAISE NOTICE '✅ Refresh your app to see the new plans';
END $$;
