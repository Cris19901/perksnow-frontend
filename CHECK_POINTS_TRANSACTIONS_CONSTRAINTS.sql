-- ============================================================================
-- CHECK: What values are allowed in points_transactions?
-- ============================================================================

-- 1. Check all constraints on the table
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'points_transactions';

-- 2. Check the specific check constraint
SELECT
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu
  ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'points_transactions'
AND cc.constraint_name LIKE '%transaction_type%';

-- 3. Look at existing data to see what values are used
SELECT DISTINCT
  transaction_type,
  COUNT(*) as count
FROM points_transactions
GROUP BY transaction_type
ORDER BY count DESC;

-- 4. Show table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'points_transactions'
ORDER BY ordinal_position;
