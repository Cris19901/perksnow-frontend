-- Create Signup Bonus System with Admin Controls

-- 1. Create signup_bonus_settings table
CREATE TABLE IF NOT EXISTS signup_bonus_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bonus_amount INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default settings (can be updated by admin)
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
    UNIQUE(user_id)
);

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_user_id ON signup_bonus_history(user_id);
CREATE INDEX IF NOT EXISTS idx_signup_bonus_history_awarded_at ON signup_bonus_history(awarded_at DESC);

-- 5. Enable RLS on both tables
ALTER TABLE signup_bonus_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_bonus_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for signup_bonus_settings

-- Allow admins to view and update settings
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

-- 7. RLS Policies for signup_bonus_history

-- Users can view their own bonus history
CREATE POLICY "Users can view own bonus history"
ON signup_bonus_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all bonus history
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

-- Allow service role to insert (for signup bonus trigger)
CREATE POLICY "Service role can insert bonus history"
ON signup_bonus_history FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- 8. Create function to award signup bonus
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
        SET points = points + v_bonus_amount
        WHERE id = NEW.id;

        -- Record bonus in history
        INSERT INTO signup_bonus_history (user_id, bonus_amount, email_sent)
        VALUES (NEW.id, v_bonus_amount, false);

        RAISE NOTICE 'Signup bonus of % points awarded to user %', v_bonus_amount, NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create trigger to award bonus on user signup
DROP TRIGGER IF EXISTS award_signup_bonus_trigger ON users;
CREATE TRIGGER award_signup_bonus_trigger
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION award_signup_bonus();

-- 10. Create function to get current signup bonus settings (for API)
CREATE OR REPLACE FUNCTION get_signup_bonus_settings()
RETURNS TABLE (
    bonus_amount INTEGER,
    is_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.bonus_amount, s.is_enabled
    FROM signup_bonus_settings s
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to update signup bonus settings (for admin)
CREATE OR REPLACE FUNCTION update_signup_bonus_settings(
    p_bonus_amount INTEGER,
    p_is_enabled BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can update signup bonus settings';
    END IF;

    -- Update settings
    UPDATE signup_bonus_settings
    SET
        bonus_amount = p_bonus_amount,
        is_enabled = p_is_enabled,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON signup_bonus_settings TO authenticated, service_role;
GRANT ALL ON signup_bonus_history TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_signup_bonus_settings() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_signup_bonus_settings(INTEGER, BOOLEAN) TO authenticated;

-- 13. Verify setup
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

SELECT '🎉 Signup bonus system ready! Test by creating a new user.' as message;
