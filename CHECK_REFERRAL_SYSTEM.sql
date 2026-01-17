-- Simple Check: Referral/Affiliate System Status
-- Run this in Supabase SQL Editor

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

-- 2. Check what columns exist in referrals table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'referrals'
ORDER BY ordinal_position;

-- 3. Check what columns exist in referral_settings table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'referral_settings'
ORDER BY ordinal_position;

-- 4. Check if triggers exist
SELECT
    trigger_name,
    event_object_table,
    '✅ Active' as status
FROM information_schema.triggers
WHERE trigger_name LIKE '%referral%'
OR trigger_name LIKE '%deposit%'
ORDER BY trigger_name;

-- 5. Show referral settings (if table exists)
SELECT *
FROM referral_settings
LIMIT 5;

-- 6. Check if any referral codes have been generated
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN referral_code IS NOT NULL AND referral_code != '' THEN 1 END) as users_with_codes,
    COUNT(CASE WHEN referral_code IS NULL OR referral_code = '' THEN 1 END) as users_without_codes
FROM users;

-- 7. Check referrals table (flexible - no assumptions about columns)
SELECT COUNT(*) as total_referrals
FROM referrals;

-- 8. Show sample referrals (if any exist)
SELECT *
FROM referrals
ORDER BY created_at DESC
LIMIT 5;

-- 9. Check deposits table
SELECT COUNT(*) as total_deposits
FROM deposits;

-- 10. Check referral earnings
SELECT COUNT(*) as total_earnings
FROM referral_earnings;

-- 11. Check if referral functions exist
SELECT
    routine_name,
    routine_type,
    '✅ Exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%referral%'
    OR routine_name LIKE '%deposit%'
)
ORDER BY routine_name;

-- Summary
DO $$
DECLARE
    table_count int;
    trigger_count int;
    function_count int;
    users_with_codes int;
    total_users int;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('referrals', 'deposits', 'referral_earnings', 'referral_settings');

    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name LIKE '%referral%' OR trigger_name LIKE '%deposit%';

    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND (routine_name LIKE '%referral%' OR routine_name LIKE '%deposit%');

    -- Count users with referral codes
    SELECT COUNT(*) INTO total_users FROM users;
    SELECT COUNT(*) INTO users_with_codes
    FROM users
    WHERE referral_code IS NOT NULL AND referral_code != '';

    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 REFERRAL SYSTEM STATUS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables found: % / 4', table_count;
    RAISE NOTICE 'Triggers found: %', trigger_count;
    RAISE NOTICE 'Functions found: %', function_count;
    RAISE NOTICE 'Users with referral codes: % / %', users_with_codes, total_users;
    RAISE NOTICE '';

    IF table_count = 4 THEN
        RAISE NOTICE '✅ Referral system tables are installed';
        IF trigger_count > 0 THEN
            RAISE NOTICE '✅ Referral triggers are active';
        END IF;
        IF users_with_codes > 0 THEN
            RAISE NOTICE '✅ Referral codes are being generated';
        ELSE
            RAISE NOTICE '⚠️  No referral codes found - system may not be running';
        END IF;
    ELSE
        RAISE NOTICE '❌ Referral system is NOT fully installed';
        RAISE NOTICE '💡 Run CREATE_REFERRAL_SYSTEM.sql to install';
    END IF;
    RAISE NOTICE '========================================';
END $$;
