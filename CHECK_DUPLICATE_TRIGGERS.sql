-- ============================================================================
-- CHECK: Why are points being awarded twice?
-- ============================================================================

-- 1. Check ALL triggers on posts table
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'posts'
ORDER BY trigger_name;

-- 2. Check recent points transactions for duplicates
SELECT
  user_id,
  activity,
  points,
  source,
  description,
  created_at
FROM points_transactions
WHERE activity = 'post_created'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Count transactions per user to see duplicates
SELECT
  user_id,
  COUNT(*) as transaction_count,
  SUM(points) as total_points,
  MAX(created_at) as latest_transaction
FROM points_transactions
WHERE activity = 'post_created'
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY latest_transaction DESC;

-- 4. Show duplicate trigger functions if any
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%award%post%'
OR routine_name LIKE '%points%post%'
ORDER BY routine_name;
