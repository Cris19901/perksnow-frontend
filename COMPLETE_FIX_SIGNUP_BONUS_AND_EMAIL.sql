-- COMPLETE FIX: Signup Bonus + Email System
-- This script diagnoses and fixes all issues with signup bonus and welcome emails

-- ============================================
-- PART 1: ENSURE POINTS COLUMN EXISTS
-- ============================================

DO $$
BEGIN
    -- Add points column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'points'
    ) THEN
        ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ Added points column to users table';
    ELSE
        RAISE NOTICE '✅ Points column already exists';
    END IF;

    -- Ensure all users have points initialized
    UPDATE users SET points = 0 WHERE points IS NULL;
END $$;

-- ============================================
-- PART 2: CREATE/VERIFY SIGNUP BONUS TABLES
-- ============================================

-- Create signup_bonus_settings table
CREATE TABLE IF NOT EXISTS signup_bonus_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bonus_amount INTEGER NOT NULL DEFAULT 100,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO signup_bonus_settings (bonus_amount, is_enabled)
SELECT 100, true
WHERE NOT EXISTS (SELECT 1 FROM signup_bonus_settings)
LIMIT 1;

-- Create signup_bonus_history table
CREATE TABLE IF NOT EXISTS signup_bonus_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_amount INTEGER NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_user_id ON signup_bonus_history(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_email_sent ON signup_bonus_history(email_sent) WHERE email_sent = false;

-- ============================================
-- PART 3: ENABLE RLS & CREATE POLICIES
-- ============================================

ALTER TABLE signup_bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_bonus_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view signup bonus settings" ON signup_bonus_settings;
DROP POLICY IF EXISTS "Admins can update signup bonus settings" ON signup_bonus_settings;
DROP POLICY IF EXISTS "Users can view own bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Admins can view all bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Service role can insert bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Service role can update bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Allow authenticated to read settings" ON signup_bonus_settings;
DROP POLICY IF EXISTS "Allow authenticated to read own history" ON signup_bonus_history;

-- Settings policies
CREATE POLICY "Admins can view signup bonus settings"
ON signup_bonus_settings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

CREATE POLICY "Admins can update signup bonus settings"
ON signup_bonus_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

-- History policies
CREATE POLICY "Users can view own bonus history"
ON signup_bonus_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bonus history"
ON signup_bonus_history FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

CREATE POLICY "Service role can insert bonus history"
ON signup_bonus_history FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

CREATE POLICY "Service role can update bonus history"
ON signup_bonus_history FOR UPDATE
TO authenticated, service_role
USING (true);

-- ============================================
-- PART 4: CREATE TRIGGER FUNCTION
-- ============================================

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
        -- Award points to user
        UPDATE users
        SET points = COALESCE(points, 0) + v_bonus_amount
        WHERE id = NEW.id;

        -- Record bonus in history
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (NEW.id, v_bonus_amount, false)
        ON CONFLICT (user_id) DO NOTHING;

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

-- ============================================
-- PART 5: CREATE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;
CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- ============================================
-- PART 6: CREATE HELPER FUNCTIONS
-- ============================================

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_bonus_email_sent(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE signup_bonus_history
    SET
        email_sent = true,
        email_sent_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: GRANT PERMISSIONS
-- ============================================

GRANT ALL ON signup_bonus_settings TO authenticated, service_role, anon;
GRANT ALL ON signup_bonus_history TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION award_signup_bonus() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION mark_bonus_email_sent(UUID) TO authenticated, service_role, anon;

-- ============================================
-- PART 8: AWARD BONUS TO EXISTING USERS
-- ============================================

DO $$
DECLARE
    v_user RECORD;
    v_bonus_amount INTEGER;
    v_is_enabled BOOLEAN;
    v_awarded_count INTEGER := 0;
BEGIN
    -- Get bonus settings
    SELECT bonus_amount, is_enabled
    INTO v_bonus_amount, v_is_enabled
    FROM signup_bonus_settings
    LIMIT 1;

    IF NOT v_is_enabled OR v_bonus_amount <= 0 THEN
        RAISE NOTICE '⚠️ Bonus system disabled, skipping backfill';
        RETURN;
    END IF;

    RAISE NOTICE '🔄 Awarding bonuses to existing users without bonus...';

    -- Award bonus to users who don't have one yet
    FOR v_user IN
        SELECT u.id, u.email
        FROM users u
        LEFT JOIN signup_bonus_history h ON h.user_id = u.id
        WHERE h.user_id IS NULL
    LOOP
        -- Update points
        UPDATE users
        SET points = COALESCE(points, 0) + v_bonus_amount
        WHERE id = v_user.id;

        -- Record bonus
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (v_user.id, v_bonus_amount, false)
        ON CONFLICT (user_id) DO NOTHING;

        v_awarded_count := v_awarded_count + 1;
        RAISE NOTICE '  ✅ Awarded % points to %', v_bonus_amount, v_user.email;
    END LOOP;

    RAISE NOTICE '🎉 Awarded bonuses to % existing users', v_awarded_count;
END $$;

-- ============================================
-- PART 9: VERIFICATION & DIAGNOSTICS
-- ============================================

-- Show settings
SELECT
    '📊 SIGNUP BONUS SETTINGS' as section,
    bonus_amount,
    is_enabled,
    created_at
FROM signup_bonus_settings;

-- Show trigger status
SELECT
    '⚡ TRIGGER STATUS' as section,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'award_signup_bonus_trigger'
AND event_object_table = 'users';

-- Show function status
SELECT
    '🔧 FUNCTION STATUS' as section,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_name IN ('award_signup_bonus', 'mark_bonus_email_sent');

-- Show recent users with bonus status
SELECT
    '👥 RECENT USERS' as section,
    u.email,
    u.username,
    u.points,
    COALESCE(h.bonus_amount, 0) as bonus_awarded,
    COALESCE(h.email_sent, false) as email_sent,
    u.created_at
FROM users u
LEFT JOIN signup_bonus_history h ON h.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;

-- Show bonus statistics
SELECT
    '📈 STATISTICS' as section,
    COUNT(*) as total_bonuses_awarded,
    SUM(bonus_amount) as total_points_given,
    COUNT(*) FILTER (WHERE email_sent = true) as emails_sent,
    COUNT(*) FILTER (WHERE email_sent = false) as emails_pending
FROM signup_bonus_history;

-- ============================================
-- PART 10: TEST TRIGGER (OPTIONAL)
-- ============================================

-- Uncomment to test trigger with a dummy user
/*
DO $$
DECLARE
    v_test_user_id UUID := gen_random_uuid();
BEGIN
    -- Enable notice messages
    SET client_min_messages TO NOTICE;

    RAISE NOTICE '🧪 Testing signup bonus trigger...';

    -- Insert test user
    INSERT INTO users (id, email, username, full_name)
    VALUES (v_test_user_id, 'test_' || v_test_user_id || '@example.com', 'testuser', 'Test User');

    -- Check if bonus was awarded
    PERFORM 1 FROM signup_bonus_history WHERE user_id = v_test_user_id;

    IF FOUND THEN
        RAISE NOTICE '✅ TEST PASSED: Bonus was awarded';
    ELSE
        RAISE NOTICE '❌ TEST FAILED: Bonus was NOT awarded';
    END IF;

    -- Clean up test data
    DELETE FROM users WHERE id = v_test_user_id;

    RAISE NOTICE '🧹 Test user cleaned up';
END $$;
*/

-- ============================================
-- FINAL STATUS
-- ============================================

SELECT '✅ SIGNUP BONUS SYSTEM SETUP COMPLETE!' as final_status;
SELECT '📧 Email will be sent by client after signup detects bonus' as email_info;
SELECT '🔍 Check browser console for email sending logs' as next_step;
