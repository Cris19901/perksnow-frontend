-- Simple version: Add Daily and Weekly subscription plans
-- Use this if the first version gives column errors

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
    is_active
) VALUES (
    'daily',
    'Daily Pass',
    'Perfect for trying out pro features for a day',
    200,
    0,
    'NGN',
    '{"ad_free": true, "priority_support": false}'::jsonb,
    '{"max_posts_per_day": 50, "max_reels_per_day": 20, "can_withdraw": true, "verified_badge": false}'::jsonb,
    2,
    true
) ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
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
    is_active
) VALUES (
    'weekly',
    'Weekly',
    'Full pro access for one week',
    1000,
    0,
    'NGN',
    '{"ad_free": true, "priority_support": false}'::jsonb,
    '{"max_posts_per_day": -1, "max_reels_per_day": -1, "can_withdraw": true, "verified_badge": true}'::jsonb,
    3,
    true
) ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_monthly = EXCLUDED.price_monthly,
    is_active = true;

-- Update sort orders
UPDATE subscription_plans SET sort_order = 1 WHERE name = 'free';
UPDATE subscription_plans SET sort_order = 2 WHERE name = 'daily';
UPDATE subscription_plans SET sort_order = 3 WHERE name = 'weekly';
UPDATE subscription_plans SET sort_order = 4 WHERE name = 'basic';
UPDATE subscription_plans SET sort_order = 5 WHERE name = 'pro';

-- Show all plans
SELECT
    name,
    display_name,
    price_monthly as price,
    currency,
    sort_order,
    is_active
FROM subscription_plans
ORDER BY sort_order;
