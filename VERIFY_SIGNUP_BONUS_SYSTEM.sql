-- ============================================================================
-- VERIFY: Complete Signup Bonus System Check
-- ============================================================================
-- This checks if the signup bonus trigger is properly configured
-- and will work for NEW user signups
-- ============================================================================

-- 1. Check if the trigger function exists and is correct
SELECT
  '1️⃣ SIGNUP BONUS TRIGGER FUNCTION' as step,
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus'
ORDER BY routine_name;

-- 2. Check if the trigger exists on users table
SELECT
  '2️⃣ TRIGGER ON USERS TABLE' as step,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND trigger_name LIKE '%signup%'
ORDER BY trigger_name;

-- 3. Check signup_bonus_history table structure
SELECT
  '3️⃣ SIGNUP BONUS HISTORY TABLE' as step,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'signup_bonus_history'
ORDER BY ordinal_position;

-- 4. Check recent signup bonuses awarded
SELECT
  '4️⃣ RECENT SIGNUP BONUSES' as step,
  sbh.user_id,
  sbh.bonus_amount,
  sbh.email_sent,
  u.email,
  u.points_balance,
  u.created_at as user_created_at
FROM signup_bonus_history sbh
JOIN users u ON u.id = sbh.user_id
ORDER BY u.created_at DESC
LIMIT 5;

-- 5. Check users without signup bonus (potential issue)
SELECT
  '5️⃣ USERS WITHOUT SIGNUP BONUS' as step,
  u.id,
  u.email,
  u.username,
  u.points_balance,
  u.created_at
FROM users u
LEFT JOIN signup_bonus_history sbh ON sbh.user_id = u.id
WHERE sbh.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 6. Check points_transactions for signup bonuses
SELECT
  '6️⃣ SIGNUP BONUS TRANSACTIONS' as step,
  pt.user_id,
  pt.points,
  pt.activity,
  pt.description,
  pt.created_at,
  u.email
FROM points_transactions pt
JOIN users u ON u.id = pt.user_id
WHERE pt.activity = 'signup_bonus'
ORDER BY pt.created_at DESC
LIMIT 5;

-- 7. Verify RLS policies on signup_bonus_history
SELECT
  '7️⃣ RLS POLICIES ON signup_bonus_history' as step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'signup_bonus_history'
ORDER BY policyname;

SELECT '✅ Signup bonus system verification complete!' as status;
SELECT 'If trigger function exists and trigger is attached, new users should get 100 points automatically' as next_step;
