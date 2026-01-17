-- ============================================================================
-- CHECK AND FIX SPECIFIC USER
-- ============================================================================
-- User ID from console: 93d5193a-b04a-49e7-ab23-08d934a83ff4
-- ============================================================================

-- 1. Check this specific user
SELECT
  'User Details' as info,
  id,
  email,
  points_balance,
  created_at
FROM users
WHERE id = '93d5193a-b04a-49e7-ab23-08d934a83ff4';

-- 2. Check if they have a signup bonus record
SELECT
  'Signup Bonus Record' as info,
  user_id,
  bonus_amount,
  email_sent
FROM signup_bonus_history
WHERE user_id = '93d5193a-b04a-49e7-ab23-08d934a83ff4';

-- 3. Check ALL users' points
SELECT
  'All Users Points' as info,
  email,
  points_balance,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- 4. FIX: Award points to this user manually
UPDATE users
SET points_balance = 100
WHERE id = '93d5193a-b04a-49e7-ab23-08d934a83ff4';

-- 5. Record the bonus
INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
VALUES ('93d5193a-b04a-49e7-ab23-08d934a83ff4', 100, false)
ON CONFLICT (user_id) DO UPDATE
SET bonus_amount = 100;

-- 6. Verify the fix
SELECT
  'AFTER FIX' as status,
  id,
  email,
  points_balance
FROM users
WHERE id = '93d5193a-b04a-49e7-ab23-08d934a83ff4';

-- 7. Also fix ALL users who have 0 points
UPDATE users
SET points_balance = 100
WHERE points_balance = 0 OR points_balance IS NULL;

-- 8. Record bonuses for all users who don't have one
INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
SELECT id, 100, false
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM signup_bonus_history WHERE user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 9. Final summary
SELECT
  'FINAL SUMMARY' as status,
  COUNT(*) as total_users,
  SUM(points_balance) as total_points,
  AVG(points_balance) as avg_points,
  MIN(points_balance) as min_points,
  MAX(points_balance) as max_points
FROM users;

SELECT
  'Users with points' as status,
  email,
  points_balance
FROM users
ORDER BY created_at DESC
LIMIT 5;
