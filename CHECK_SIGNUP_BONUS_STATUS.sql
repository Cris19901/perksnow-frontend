-- Check Signup Bonus System Status

-- 1. Check if signup_bonus_settings table exists and has data
SELECT
    '1. Bonus Settings:' as check_name,
    bonus_amount,
    is_enabled,
    created_at
FROM signup_bonus_settings
LIMIT 1;

-- 2. Check recent users and their points
SELECT
    '2. Recent Users:' as check_name,
    id,
    email,
    username,
    points,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check if any bonuses were awarded
SELECT
    '3. Bonus History:' as check_name,
    COUNT(*) as total_bonuses,
    SUM(bonus_amount) as total_points,
    COUNT(*) FILTER (WHERE email_sent = true) as emails_sent,
    COUNT(*) FILTER (WHERE email_sent = false) as emails_pending
FROM signup_bonus_history;

-- 4. Check if trigger exists
SELECT
    '4. Trigger Status:' as check_name,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger'
AND event_object_table = 'users';

-- 5. Check if function exists
SELECT
    '5. Function Status:' as check_name,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';

-- 6. Check recent bonus awards (if any)
SELECT
    '6. Recent Bonus Awards:' as check_name,
    h.user_id,
    u.email,
    u.username,
    h.bonus_amount,
    h.awarded_at,
    h.email_sent
FROM signup_bonus_history h
JOIN users u ON u.id = h.user_id
ORDER BY h.awarded_at DESC
LIMIT 5;

-- 7. Check if there's a settings row
SELECT
    '7. Settings Row Count:' as check_name,
    COUNT(*) as settings_count
FROM signup_bonus_settings;
