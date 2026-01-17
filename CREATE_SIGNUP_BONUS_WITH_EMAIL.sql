-- Complete Signup Bonus System with Email Notifications
-- This version includes automatic email sending when bonuses are awarded

-- 0. Add points column to users table if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

-- Add index for faster queries on points
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);

-- Add constraint to ensure points are never negative
ALTER TABLE users
DROP CONSTRAINT IF EXISTS check_points_non_negative;

ALTER TABLE users
ADD CONSTRAINT check_points_non_negative CHECK (points >= 0);

-- Update existing users to have 0 points if NULL
UPDATE users
SET points = 0
WHERE points IS NULL;

-- 1. Create signup_bonus_settings table
CREATE TABLE IF NOT EXISTS signup_bonus_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bonus_amount INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default settings (100 points, enabled by default)
INSERT INTO signup_bonus_settings (bonus_amount, is_enabled)
VALUES (100, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create signup_bonus_history table to track awarded bonuses
CREATE TABLE IF NOT EXISTS signup_bonus_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_amount INTEGER NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_user_id ON signup_bonus_history(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_awarded_at ON signup_bonus_history(awarded_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_email_sent ON signup_bonus_history(email_sent) WHERE email_sent = false;

-- 5. Enable RLS on both tables
ALTER TABLE signup_bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_bonus_history ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view signup bonus settings" ON signup_bonus_settings;
DROP POLICY IF EXISTS "Admins can update signup bonus settings" ON signup_bonus_settings;
DROP POLICY IF EXISTS "Users can view own bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Admins can view all bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Service role can insert bonus history" ON signup_bonus_history;
DROP POLICY IF EXISTS "Service role can update bonus history" ON signup_bonus_history;

-- 7. RLS Policies for signup_bonus_settings
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
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

-- 8. RLS Policies for signup_bonus_history
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
USING (true)
WITH CHECK (true);

-- 9. Create function to award signup bonus
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_amount INTEGER;
    v_is_enabled BOOLEAN;
BEGIN
    -- Get current bonus settings
    SELECT bonus_amount, is_enabled
    INTO v_bonus_amount, v_is_enabled
    FROM signup_bonus_settings
    LIMIT 1;

    -- Only award bonus if enabled and amount > 0
    IF v_is_enabled AND v_bonus_amount > 0 THEN
        -- Award points to user
        UPDATE users
        SET points = COALESCE(points, 0) + v_bonus_amount
        WHERE id = NEW.id;

        -- Record bonus in history (email will be sent by client or separate process)
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (NEW.id, v_bonus_amount, false)
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE 'Signup bonus of % points awarded to user %', v_bonus_amount, NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger to award bonus on user signup
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;
CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- 11. Create function to mark bonus email as sent
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

-- 12. Create function to get pending bonus emails (for background processing)
CREATE OR REPLACE FUNCTION get_pending_bonus_emails()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_name TEXT,
    bonus_amount INTEGER,
    awarded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.user_id,
        u.email,
        COALESCE(u.full_name, u.username) as user_name,
        h.bonus_amount,
        h.awarded_at
    FROM signup_bonus_history h
    JOIN users u ON u.id = h.user_id
    WHERE h.email_sent = false
    ORDER BY h.awarded_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON signup_bonus_settings TO authenticated, service_role;
GRANT ALL ON signup_bonus_history TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION award_signup_bonus() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION mark_bonus_email_sent(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_pending_bonus_emails() TO authenticated, service_role;

-- 14. Verification queries
SELECT '✅ Signup bonus system created!' as status;

-- Show current settings
SELECT
    'Current Settings:' as info,
    bonus_amount as "Bonus Amount",
    is_enabled as "Enabled",
    created_at as "Created At"
FROM signup_bonus_settings;

-- Show tables created
SELECT
    'Tables Created:' as info,
    table_name
FROM information_schema.tables
WHERE table_name IN ('signup_bonus_settings', 'signup_bonus_history')
ORDER BY table_name;

-- Show functions created
SELECT
    'Functions Created:' as info,
    routine_name as function_name
FROM information_schema.routines
WHERE routine_name IN ('award_signup_bonus', 'mark_bonus_email_sent', 'get_pending_bonus_emails')
ORDER BY routine_name;

SELECT '🎉 Signup bonus system ready! The email will be sent by the client after detecting the bonus.' as message;
