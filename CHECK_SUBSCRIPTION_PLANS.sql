-- Check all subscription plans in the database
SELECT
  name,
  is_active,
  price_monthly,
  price_yearly,
  sort_order,
  created_at
FROM subscription_plans
ORDER BY sort_order;

-- Specifically check for Daily plan
SELECT
  'Daily plan status' as info,
  name,
  is_active,
  price_monthly,
  sort_order
FROM subscription_plans
WHERE name = 'daily' OR name ILIKE '%daily%';
