-- Simple check: What do we have?

-- 1. Check if points_balance column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('points', 'points_balance');

-- 2. Check actual user points
SELECT email, points_balance
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'mark_onboarding_step_complete',
  'get_user_onboarding_progress',
  'award_signup_bonus'
);
