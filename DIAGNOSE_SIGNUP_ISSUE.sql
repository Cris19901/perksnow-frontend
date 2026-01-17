-- COMPREHENSIVE DIAGNOSTIC: Why Signup Bonus Isn't Working

-- ============================================
-- PART 1: CHECK IF TABLES EXIST
-- ============================================

SELECT '1️⃣ CHECKING IF TABLES EXIST' as step;

SELECT
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables
WHERE table_name IN ('signup_bonus_settings', 'signup_bonus_history', 'users')
ORDER BY table_name;

-- ============================================
-- PART 2: CHECK IF POINTS COLUMN EXISTS
-- ============================================

SELECT '2️⃣ CHECKING IF POINTS COLUMN EXISTS' as step;

SELECT
    column_name,
    data_type,
    column_default,
    is_nullable,
    CASE WHEN column_name = 'points' THEN '✅ EXISTS' ELSE '⚠️ OTHER' END as status
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('id', 'email', 'points', 'created_at')
ORDER BY column_name;

-- ============================================
-- PART 3: CHECK SIGNUP BONUS SETTINGS
-- ============================================

SELECT '3️⃣ CHECKING SIGNUP BONUS SETTINGS' as step;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_settings') THEN
        RAISE NOTICE '✅ signup_bonus_settings table exists';

        -- Check if there's data
        PERFORM 1 FROM signup_bonus_settings LIMIT 1;
        IF FOUND THEN
            RAISE NOTICE '✅ Settings table has data';
        ELSE
            RAISE NOTICE '❌ Settings table is EMPTY';
        END IF;
    ELSE
        RAISE NOTICE '❌ signup_bonus_settings table DOES NOT EXIST';
    END IF;
END $$;

-- Show settings if table exists
SELECT
    bonus_amount,
    is_enabled,
    created_at,
    CASE
        WHEN is_enabled AND bonus_amount > 0 THEN '✅ ACTIVE'
        WHEN NOT is_enabled THEN '❌ DISABLED'
        WHEN bonus_amount = 0 THEN '❌ AMOUNT IS 0'
        ELSE '⚠️ UNKNOWN'
    END as status
FROM signup_bonus_settings
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_settings');

-- ============================================
-- PART 4: CHECK IF TRIGGER EXISTS
-- ============================================

SELECT '4️⃣ CHECKING IF TRIGGER EXISTS' as step;

SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    CASE
        WHEN trigger_name IS NOT NULL THEN '✅ TRIGGER EXISTS'
        ELSE '❌ TRIGGER MISSING'
    END as status
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger'
AND event_object_table = 'users';

-- If no results, trigger doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'award_signup_bonus_trigger'
    ) THEN
        RAISE NOTICE '❌ TRIGGER DOES NOT EXIST - This is why bonuses are not being awarded!';
    END IF;
END $$;

-- ============================================
-- PART 5: CHECK IF FUNCTION EXISTS
-- ============================================

SELECT '5️⃣ CHECKING IF TRIGGER FUNCTION EXISTS' as step;

SELECT
    routine_name,
    routine_type,
    CASE
        WHEN routine_name IS NOT NULL THEN '✅ FUNCTION EXISTS'
        ELSE '❌ FUNCTION MISSING'
    END as status
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';

-- ============================================
-- PART 6: CHECK RECENT USERS AND THEIR POINTS
-- ============================================

SELECT '6️⃣ CHECKING RECENT USERS' as step;

SELECT
    u.email,
    u.username,
    COALESCE(u.points, 0) as points,
    u.created_at,
    CASE
        WHEN h.user_id IS NOT NULL THEN '✅ Has Bonus'
        ELSE '❌ No Bonus'
    END as bonus_status,
    COALESCE(h.bonus_amount, 0) as bonus_amount
FROM users u
LEFT JOIN signup_bonus_history h ON h.user_id = u.id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_history')
ORDER BY u.created_at DESC
LIMIT 5;

-- ============================================
-- PART 7: TEST TRIGGER MANUALLY
-- ============================================

SELECT '7️⃣ TESTING TRIGGER MANUALLY' as step;

DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
    v_test_email TEXT := 'test_' || v_test_user_id || '@example.com';
    v_bonus_awarded BOOLEAN := false;
    v_points_before INTEGER := 0;
    v_points_after INTEGER := 0;
BEGIN
    -- Only run test if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_settings')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_history') THEN

        RAISE NOTICE '🧪 Creating test user to verify trigger...';

        -- Insert test user
        INSERT INTO users (id, email, username, full_name)
        VALUES (v_test_user_id, v_test_email, 'testuser_diag', 'Test User Diagnostic');

        -- Wait a moment for trigger
        PERFORM pg_sleep(0.5);

        -- Check if bonus was awarded
        SELECT EXISTS(
            SELECT 1 FROM signup_bonus_history WHERE user_id = v_test_user_id
        ) INTO v_bonus_awarded;

        -- Check points
        SELECT COALESCE(points, 0) INTO v_points_after
        FROM users WHERE id = v_test_user_id;

        IF v_bonus_awarded AND v_points_after > 0 THEN
            RAISE NOTICE '✅ TEST PASSED: Trigger is working! User got % points', v_points_after;
        ELSE
            RAISE NOTICE '❌ TEST FAILED: Trigger did NOT work';
            RAISE NOTICE '   - Bonus awarded: %', v_bonus_awarded;
            RAISE NOTICE '   - Points: %', v_points_after;
        END IF;

        -- Clean up test user
        DELETE FROM users WHERE id = v_test_user_id;
        RAISE NOTICE '🧹 Test user cleaned up';
    ELSE
        RAISE NOTICE '⚠️ Cannot run test - tables missing';
    END IF;
END $$;

-- ============================================
-- PART 8: SUMMARY AND RECOMMENDATIONS
-- ============================================

SELECT '8️⃣ SUMMARY & NEXT STEPS' as step;

DO $$
DECLARE
    v_has_settings BOOLEAN;
    v_has_history BOOLEAN;
    v_has_points_column BOOLEAN;
    v_has_trigger BOOLEAN;
    v_has_function BOOLEAN;
    v_settings_enabled BOOLEAN := false;
    v_bonus_amount INTEGER := 0;
BEGIN
    -- Check what exists
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_settings')
    INTO v_has_settings;

    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'signup_bonus_history')
    INTO v_has_history;

    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'points')
    INTO v_has_points_column;

    SELECT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'award_signup_bonus_trigger')
    INTO v_has_trigger;

    SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'award_signup_bonus')
    INTO v_has_function;

    IF v_has_settings THEN
        SELECT is_enabled, bonus_amount INTO v_settings_enabled, v_bonus_amount
        FROM signup_bonus_settings LIMIT 1;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '                    DIAGNOSTIC SUMMARY                  ';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Points Column Exists:        %', CASE WHEN v_has_points_column THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'Settings Table Exists:       %', CASE WHEN v_has_settings THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'History Table Exists:        %', CASE WHEN v_has_history THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'Trigger Function Exists:     %', CASE WHEN v_has_function THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'Trigger Exists:              %', CASE WHEN v_has_trigger THEN '✅ YES' ELSE '❌ NO' END;

    IF v_has_settings THEN
        RAISE NOTICE 'Settings Enabled:            %', CASE WHEN v_settings_enabled THEN '✅ YES' ELSE '❌ NO' END;
        RAISE NOTICE 'Bonus Amount:                % points', v_bonus_amount;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '                    RECOMMENDATIONS                     ';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '';

    IF NOT v_has_points_column THEN
        RAISE NOTICE '❌ CRITICAL: Points column missing from users table';
        RAISE NOTICE '   → Run: ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;';
    END IF;

    IF NOT v_has_settings OR NOT v_has_history THEN
        RAISE NOTICE '❌ CRITICAL: Signup bonus tables missing';
        RAISE NOTICE '   → Run: COMPLETE_FIX_SIGNUP_BONUS_AND_EMAIL.sql';
    END IF;

    IF NOT v_has_function THEN
        RAISE NOTICE '❌ CRITICAL: Trigger function missing';
        RAISE NOTICE '   → Run: COMPLETE_FIX_SIGNUP_BONUS_AND_EMAIL.sql';
    END IF;

    IF NOT v_has_trigger THEN
        RAISE NOTICE '❌ CRITICAL: Trigger not attached to users table';
        RAISE NOTICE '   → This is why bonuses are not being awarded!';
        RAISE NOTICE '   → Run: COMPLETE_FIX_SIGNUP_BONUS_AND_EMAIL.sql';
    END IF;

    IF v_has_settings AND NOT v_settings_enabled THEN
        RAISE NOTICE '⚠️ WARNING: Bonus system is disabled';
        RAISE NOTICE '   → Run: UPDATE signup_bonus_settings SET is_enabled = true;';
    END IF;

    IF v_has_settings AND v_bonus_amount = 0 THEN
        RAISE NOTICE '⚠️ WARNING: Bonus amount is 0';
        RAISE NOTICE '   → Run: UPDATE signup_bonus_settings SET bonus_amount = 100;';
    END IF;

    IF v_has_points_column AND v_has_settings AND v_has_history AND v_has_trigger AND v_has_function AND v_settings_enabled AND v_bonus_amount > 0 THEN
        RAISE NOTICE '✅ ALL CHECKS PASSED!';
        RAISE NOTICE '   System should be working. If not, check:';
        RAISE NOTICE '   1. RLS policies on signup_bonus_history table';
        RAISE NOTICE '   2. Browser console for errors during signup';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════';
END $$;

SELECT '✅ DIAGNOSTIC COMPLETE' as final_status;
