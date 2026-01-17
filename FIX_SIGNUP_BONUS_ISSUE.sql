-- Fix Signup Bonus Not Being Awarded

-- Step 1: Check if settings table exists and has proper data
DO $$
DECLARE
    v_settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_settings_count FROM signup_bonus_settings;

    IF v_settings_count = 0 THEN
        RAISE NOTICE '❌ No settings found. Inserting default settings...';
        INSERT INTO signup_bonus_settings (bonus_amount, is_enabled)
        VALUES (100, true);
        RAISE NOTICE '✅ Default settings inserted';
    ELSE
        RAISE NOTICE '✅ Settings table exists with % row(s)', v_settings_count;
    END IF;
END $$;

-- Step 2: Verify current settings
SELECT
    '📊 Current Bonus Settings:' as status,
    id,
    bonus_amount,
    is_enabled,
    created_at
FROM signup_bonus_settings;

-- Step 3: Check if trigger function exists
SELECT
    '🔧 Trigger Function:' as status,
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';

-- Step 4: Check if trigger exists on users table
SELECT
    '⚡ Trigger Status:' as status,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger'
AND event_object_table = 'users';

-- Step 5: Test the trigger manually on the most recent user
DO $$
DECLARE
    v_latest_user_id UUID;
    v_latest_user_email TEXT;
    v_user_points INTEGER;
    v_bonus_exists BOOLEAN;
    v_bonus_amount INTEGER;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get the most recent user
    SELECT id, email, COALESCE(points, 0)
    INTO v_latest_user_id, v_latest_user_email, v_user_points
    FROM users
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_latest_user_id IS NULL THEN
        RAISE NOTICE '❌ No users found in database';
        RETURN;
    END IF;

    RAISE NOTICE '👤 Latest User: % (%) with % points', v_latest_user_email, v_latest_user_id, v_user_points;

    -- Check if bonus was awarded
    SELECT EXISTS(
        SELECT 1 FROM signup_bonus_history WHERE user_id = v_latest_user_id
    ) INTO v_bonus_exists;

    IF v_bonus_exists THEN
        RAISE NOTICE '✅ Bonus already recorded in history for this user';
    ELSE
        RAISE NOTICE '❌ No bonus found in history for this user';

        -- Get settings
        SELECT bonus_amount, is_enabled
        INTO v_bonus_amount, v_is_enabled
        FROM signup_bonus_settings
        LIMIT 1;

        RAISE NOTICE '⚙️ Settings: bonus_amount=%, is_enabled=%', v_bonus_amount, v_is_enabled;

        -- Manually award bonus if enabled
        IF v_is_enabled AND v_bonus_amount > 0 THEN
            RAISE NOTICE '🎁 Manually awarding % points to user...', v_bonus_amount;

            -- Update user points
            UPDATE users
            SET points = COALESCE(points, 0) + v_bonus_amount
            WHERE id = v_latest_user_id;

            -- Record bonus
            INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
            VALUES (v_latest_user_id, v_bonus_amount, false)
            ON CONFLICT (user_id) DO NOTHING;

            RAISE NOTICE '✅ Bonus awarded successfully!';
        ELSE
            RAISE NOTICE '⚠️ Bonus system is disabled or amount is 0';
        END IF;
    END IF;
END $$;

-- Step 6: Show updated user data
SELECT
    '👥 Recent Users with Points:' as status,
    u.id,
    u.email,
    u.username,
    u.points,
    u.created_at,
    CASE
        WHEN h.user_id IS NOT NULL THEN '✅ Bonus Awarded'
        ELSE '❌ No Bonus'
    END as bonus_status
FROM users u
LEFT JOIN signup_bonus_history h ON h.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;

-- Step 7: Show bonus history
SELECT
    '📜 Bonus History:' as status,
    h.user_id,
    u.email,
    h.bonus_amount,
    h.awarded_at,
    h.email_sent
FROM signup_bonus_history h
JOIN users u ON u.id = h.user_id
ORDER BY h.awarded_at DESC
LIMIT 10;

-- Step 8: Enable bonus if it's disabled
UPDATE signup_bonus_settings
SET is_enabled = true
WHERE is_enabled = false;

SELECT '✅ Signup bonus system check complete!' as final_status;
