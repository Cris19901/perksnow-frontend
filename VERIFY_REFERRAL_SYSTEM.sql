-- Verify Referral/Affiliate System Status
-- Run this in Supabase SQL Editor to check if the system is working

-- 1. Check if referral tables exist
SELECT
    table_name,
    CASE
        WHEN table_name IN (
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ Exists'
        ELSE '❌ Missing'
    END as status
FROM (
    VALUES
        ('referrals'),
        ('deposits'),
        ('referral_earnings'),
        ('referral_settings')
) AS t(table_name);

-- 2. Check if triggers exist
SELECT
    trigger_name,
    event_object_table,
    action_statement,
    '✅ Active' as status
FROM information_schema.triggers
WHERE trigger_name IN (
    'generate_referral_code_trigger',
    'process_deposit_rewards_trigger'
)
ORDER BY trigger_name;

-- 3. Check referral settings (rewards configuration)
SELECT
    '✅ Settings exist' as status,
    points_per_signup,
    points_per_first_deposit,
    percentage_per_deposit,
    max_deposits_for_percentage,
    is_active
FROM referral_settings
WHERE is_active = true
LIMIT 1;

-- 4. Check if any referral codes have been generated
SELECT
    COUNT(*) as total_users_with_codes,
    COUNT(CASE WHEN referral_code IS NOT NULL THEN 1 END) as users_with_codes
FROM users;

-- 5. Check if any referrals have been tracked
SELECT
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN is_complete = true THEN 1 END) as completed_referrals,
    SUM(points_awarded) as total_points_awarded
FROM referrals;

-- 6. Check if any deposits have been tracked
SELECT
    COUNT(*) as total_deposits,
    SUM(amount) as total_amount,
    COUNT(DISTINCT user_id) as unique_depositors
FROM deposits;

-- 7. Check if any referral earnings have been recorded
SELECT
    COUNT(*) as total_earnings,
    SUM(amount) as total_earnings_amount,
    SUM(points_awarded) as total_points_from_earnings
FROM referral_earnings;

-- 8. Sample data - Recent referrals (if any)
SELECT
    r.id,
    u1.username as referrer,
    u2.username as referred_user,
    r.points_awarded,
    r.is_complete,
    r.created_at
FROM referrals r
LEFT JOIN users u1 ON u1.id = r.referrer_id
LEFT JOIN users u2 ON u2.id = r.referred_user_id
ORDER BY r.created_at DESC
LIMIT 5;

-- 9. Check if referral code generation function exists
SELECT
    routine_name,
    '✅ Function exists' as status
FROM information_schema.routines
WHERE routine_name IN (
    'generate_referral_code',
    'process_deposit_rewards'
)
AND routine_schema = 'public';

-- Summary
DO $$
DECLARE
    table_count int;
    trigger_count int;
    function_count int;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('referrals', 'deposits', 'referral_earnings', 'referral_settings');

    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name IN ('generate_referral_code_trigger', 'process_deposit_rewards_trigger');

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('generate_referral_code', 'process_deposit_rewards')
    AND routine_schema = 'public';

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 REFERRAL SYSTEM STATUS SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables: % / 4', table_count;
    RAISE NOTICE 'Triggers: % / 2', trigger_count;
    RAISE NOTICE 'Functions: % / 2', function_count;
    RAISE NOTICE '';

    IF table_count = 4 AND trigger_count = 2 AND function_count = 2 THEN
        RAISE NOTICE '✅ Referral system is FULLY INSTALLED';
        RAISE NOTICE '✅ All components are active';
    ELSE
        RAISE NOTICE '⚠️  Referral system is PARTIALLY INSTALLED';
        RAISE NOTICE '⚠️  Some components may be missing';
        RAISE NOTICE '';
        RAISE NOTICE '💡 Run CREATE_REFERRAL_SYSTEM.sql to complete setup';
    END IF;
    RAISE NOTICE '========================================';
END $$;
