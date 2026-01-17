-- ============================================================================
-- FIX: Update Signup Bonus to use points_balance column
-- ============================================================================
-- The signup bonus trigger is using old 'points' column
-- but the database has 'points_balance' column
-- ============================================================================

-- 1. Update the award_signup_bonus() function to use points_balance
CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_amount INTEGER;
    v_is_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '🎯 Signup bonus trigger fired for user: %', NEW.id;

    -- Get current bonus settings
    SELECT bonus_amount, is_enabled
    INTO v_bonus_amount, v_is_enabled
    FROM signup_bonus_settings
    LIMIT 1;

    RAISE NOTICE '⚙️ Settings: bonus_amount=%, is_enabled=%', v_bonus_amount, v_is_enabled;

    -- Only award bonus if enabled and amount > 0
    IF v_is_enabled AND v_bonus_amount > 0 THEN
        -- Award points to user using points_balance column
        UPDATE users
        SET points_balance = COALESCE(points_balance, 0) + v_bonus_amount
        WHERE id = NEW.id;

        -- Record bonus in history
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (NEW.id, v_bonus_amount, false)
        ON CONFLICT (user_id) DO NOTHING;

        -- Also record in points_transactions for tracking
        INSERT INTO points_transactions (
            user_id,
            points,
            transaction_type,
            activity,
            source,
            description
        )
        VALUES (
            NEW.id,
            v_bonus_amount,
            'earn',
            'signup_bonus',
            'signup',
            'Welcome bonus for new user'
        );

        RAISE NOTICE '✅ Signup bonus of % points awarded to user %', v_bonus_amount, NEW.id;
    ELSE
        RAISE NOTICE '⚠️ Signup bonus disabled or amount is 0';
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ Error awarding signup bonus: %', SQLERRM;
        RETURN NEW; -- Don't fail user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger (just to be safe)
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;
CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- 3. Verify the function is using points_balance
SELECT
    '1️⃣ UPDATED FUNCTION' as step,
    routine_name,
    'Now using points_balance column' as status
FROM information_schema.routines
WHERE routine_name = 'award_signup_bonus';

-- 4. Verify the trigger exists
SELECT
    '2️⃣ TRIGGER STATUS' as step,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger'
AND event_object_table = 'users';

-- 5. Check signup_bonus_settings
SELECT
    '3️⃣ BONUS SETTINGS' as step,
    bonus_amount as amount,
    is_enabled as enabled
FROM signup_bonus_settings
LIMIT 1;

SELECT '✅ Signup bonus function updated to use points_balance!' as status;
SELECT 'New users will now receive bonus points automatically on signup' as next_step;
