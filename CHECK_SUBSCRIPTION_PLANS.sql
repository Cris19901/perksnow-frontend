-- Check subscription plans table structure and data
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- View all current subscription plans
SELECT * FROM subscription_plans ORDER BY price_ngn;
