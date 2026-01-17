-- Complete Referral System with Points & Percentage Earnings
-- Features:
-- 1. Points reward when referral makes first deposit
-- 2. Percentage earnings from referral deposits (up to 10 times)
-- 3. Admin controls for all settings

-- ============================================
-- STEP 1: CREATE REFERRAL SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Points reward settings for SIGNUP
    points_per_signup INTEGER NOT NULL DEFAULT 20, -- Points when someone signs up
    signup_points_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Points reward settings for DEPOSIT
    points_per_deposit INTEGER NOT NULL DEFAULT 50, -- Points when referral makes deposit
    deposit_points_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Percentage earnings settings
    percentage_per_deposit DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- 5% default
    percentage_reward_enabled BOOLEAN NOT NULL DEFAULT true,
    max_earnings_count INTEGER NOT NULL DEFAULT 10, -- Earn from up to 10 deposits

    -- General settings
    min_deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00, -- Minimum deposit to trigger rewards
    is_enabled BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO referral_settings (
    points_per_signup,
    signup_points_enabled,
    points_per_deposit,
    deposit_points_enabled,
    percentage_per_deposit,
    percentage_reward_enabled,
    max_earnings_count,
    min_deposit_amount,
    is_enabled
)
VALUES (20, true, 50, true, 5.00, true, 10, 10.00, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: ADD REFERRAL CODE TO USERS TABLE
-- ============================================

-- Add referral code column (unique for each user)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;

-- Add referred_by column (who referred this user)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add wallet balance column for percentage earnings
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Create index for faster referral code lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- Generate referral codes for existing users
UPDATE users
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- ============================================
-- STEP 3: CREATE REFERRALS TABLE (TRACKING)
-- ============================================

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Who made the referral
    referee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- Who was referred

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, completed
    first_deposit_at TIMESTAMP WITH TIME ZONE,

    -- Earnings tracking
    total_points_earned INTEGER NOT NULL DEFAULT 0,
    total_percentage_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    deposits_tracked INTEGER NOT NULL DEFAULT 0, -- How many deposits have been tracked

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(referrer_id, referee_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ============================================
-- STEP 4: CREATE DEPOSITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Deposit details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255) UNIQUE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed

    -- Referral tracking
    referral_commission_paid BOOLEAN NOT NULL DEFAULT false,
    referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT check_amount_positive CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_referral_id ON deposits(referral_id);

-- ============================================
-- STEP 5: CREATE REFERRAL EARNINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    deposit_id UUID NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Earning details
    earning_type VARCHAR(20) NOT NULL, -- 'points' or 'percentage'
    points_earned INTEGER DEFAULT 0,
    percentage_earned DECIMAL(10,2) DEFAULT 0.00,
    deposit_amount DECIMAL(10,2) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(deposit_id, referrer_id, earning_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON referral_earnings(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_deposit_id ON referral_earnings(deposit_id);

-- ============================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 7: RLS POLICIES FOR REFERRAL_SETTINGS
-- ============================================

-- Admins can view and update
CREATE POLICY "Admins can view referral settings"
ON referral_settings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

CREATE POLICY "Admins can update referral settings"
ON referral_settings FOR UPDATE
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

-- ============================================
-- STEP 8: RLS POLICIES FOR REFERRALS
-- ============================================

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view own referrals"
ON referrals FOR SELECT
TO authenticated
USING (referrer_id = auth.uid());

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
ON referrals FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

-- Service role can insert/update
CREATE POLICY "Service can manage referrals"
ON referrals FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- STEP 9: RLS POLICIES FOR DEPOSITS
-- ============================================

-- Users can view own deposits
CREATE POLICY "Users can view own deposits"
ON deposits FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert own deposits
CREATE POLICY "Users can create deposits"
ON deposits FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Service can update deposits
CREATE POLICY "Service can update deposits"
ON deposits FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view all deposits
CREATE POLICY "Admins can view all deposits"
ON deposits FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

-- ============================================
-- STEP 10: RLS POLICIES FOR REFERRAL_EARNINGS
-- ============================================

-- Users can view own earnings
CREATE POLICY "Users can view own earnings"
ON referral_earnings FOR SELECT
TO authenticated
USING (referrer_id = auth.uid());

-- Admins can view all earnings
CREATE POLICY "Admins can view all earnings"
ON referral_earnings FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.is_admin = true
    )
);

-- Service role can insert earnings
CREATE POLICY "Service can insert earnings"
ON referral_earnings FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================
-- STEP 11: FUNCTION TO GENERATE REFERRAL CODE
-- ============================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate unique referral code if not set
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NEW.id::TEXT) FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON users;
CREATE TRIGGER generate_referral_code_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_referral_code();

-- ============================================
-- STEP 12: FUNCTION TO TRACK REFERRALS & AWARD SIGNUP POINTS
-- ============================================

CREATE OR REPLACE FUNCTION track_referral(p_referee_id UUID, p_referral_code VARCHAR)
RETURNS VOID AS $$
DECLARE
    v_referrer_id UUID;
    v_settings RECORD;
    v_points_to_award INTEGER;
BEGIN
    -- Find referrer by referral code
    SELECT id INTO v_referrer_id
    FROM users
    WHERE referral_code = p_referral_code
    AND id != p_referee_id; -- Can't refer yourself

    IF v_referrer_id IS NOT NULL THEN
        -- Get referral settings
        SELECT * INTO v_settings FROM referral_settings LIMIT 1;

        -- Update referee's referred_by
        UPDATE users
        SET referred_by = v_referrer_id
        WHERE id = p_referee_id;

        -- Create referral tracking record
        INSERT INTO referrals (referrer_id, referee_id, status)
        VALUES (v_referrer_id, p_referee_id, 'pending')
        ON CONFLICT (referrer_id, referee_id) DO NOTHING;

        -- ==============================================
        -- REWARD 1: POINTS FOR SIGNUP
        -- ==============================================
        IF v_settings.is_enabled AND v_settings.signup_points_enabled THEN
            v_points_to_award := v_settings.points_per_signup;

            -- Award points to referrer
            UPDATE users
            SET points = points + v_points_to_award
            WHERE id = v_referrer_id;

            -- Update referral tracking
            UPDATE referrals
            SET total_points_earned = total_points_earned + v_points_to_award
            WHERE referrer_id = v_referrer_id AND referee_id = p_referee_id;

            -- Record earning (without deposit_id for signup reward)
            INSERT INTO referral_earnings (
                referral_id,
                deposit_id,
                referrer_id,
                earning_type,
                points_earned,
                deposit_amount
            )
            SELECT
                r.id,
                NULL, -- No deposit yet
                v_referrer_id,
                'points_signup',
                v_points_to_award,
                0.00
            FROM referrals r
            WHERE r.referrer_id = v_referrer_id AND r.referee_id = p_referee_id;

            RAISE NOTICE 'Signup reward: % points awarded to % for new signup', v_points_to_award, v_referrer_id;
        END IF;

        RAISE NOTICE 'Referral tracked: % referred by %', p_referee_id, v_referrer_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 13: FUNCTION TO PROCESS DEPOSIT REWARDS
-- ============================================

CREATE OR REPLACE FUNCTION process_deposit_rewards()
RETURNS TRIGGER AS $$
DECLARE
    v_referral RECORD;
    v_settings RECORD;
    v_points_to_award INTEGER;
    v_percentage_to_award DECIMAL(10,2);
    v_is_first_deposit BOOLEAN;
BEGIN
    -- Only process completed deposits
    IF NEW.status != 'completed' OR OLD.status = 'completed' THEN
        RETURN NEW;
    END IF;

    -- Get referral settings
    SELECT * INTO v_settings FROM referral_settings LIMIT 1;

    -- Check if system is enabled
    IF NOT v_settings.is_enabled OR NEW.amount < v_settings.min_deposit_amount THEN
        RETURN NEW;
    END IF;

    -- Get referral info
    SELECT * INTO v_referral
    FROM referrals
    WHERE referee_id = NEW.user_id
    AND status IN ('pending', 'active')
    LIMIT 1;

    IF v_referral IS NULL THEN
        RETURN NEW; -- User wasn't referred
    END IF;

    -- Check if this is first deposit
    v_is_first_deposit := (v_referral.first_deposit_at IS NULL);

    -- Update referral record
    UPDATE referrals
    SET
        first_deposit_at = COALESCE(first_deposit_at, NEW.completed_at),
        status = 'active',
        deposits_tracked = deposits_tracked + 1,
        updated_at = NOW()
    WHERE id = v_referral.id;

    -- Link deposit to referral
    UPDATE deposits
    SET referral_id = v_referral.id
    WHERE id = NEW.id;

    -- ==============================================
    -- REWARD 2: POINTS FOR DEPOSIT
    -- ==============================================
    IF v_is_first_deposit AND v_settings.deposit_points_enabled THEN
        v_points_to_award := v_settings.points_per_deposit;

        -- Award points to referrer
        UPDATE users
        SET points = points + v_points_to_award
        WHERE id = v_referral.referrer_id;

        -- Update referral tracking
        UPDATE referrals
        SET total_points_earned = total_points_earned + v_points_to_award
        WHERE id = v_referral.id;

        -- Record earning
        INSERT INTO referral_earnings (
            referral_id,
            deposit_id,
            referrer_id,
            earning_type,
            points_earned,
            deposit_amount
        ) VALUES (
            v_referral.id,
            NEW.id,
            v_referral.referrer_id,
            'points_deposit',
            v_points_to_award,
            NEW.amount
        );

        RAISE NOTICE 'Deposit points reward: % points awarded to % for first deposit', v_points_to_award, v_referral.referrer_id;
    END IF;

    -- ==============================================
    -- REWARD 3: PERCENTAGE FROM DEPOSIT (UP TO 10 TIMES)
    -- ==============================================
    IF v_settings.percentage_reward_enabled AND v_referral.deposits_tracked <= v_settings.max_earnings_count THEN
        v_percentage_to_award := (NEW.amount * v_settings.percentage_per_deposit / 100);

        -- Add to referrer's wallet
        UPDATE users
        SET wallet_balance = wallet_balance + v_percentage_to_award
        WHERE id = v_referral.referrer_id;

        -- Update referral tracking
        UPDATE referrals
        SET total_percentage_earned = total_percentage_earned + v_percentage_to_award
        WHERE id = v_referral.id;

        -- Record earning
        INSERT INTO referral_earnings (
            referral_id,
            deposit_id,
            referrer_id,
            earning_type,
            percentage_earned,
            deposit_amount
        ) VALUES (
            v_referral.id,
            NEW.id,
            v_referral.referrer_id,
            'percentage',
            v_percentage_to_award,
            NEW.amount
        );

        RAISE NOTICE 'Percentage reward: $% awarded to % (%.2f%% of $%)', v_percentage_to_award, v_referral.referrer_id, v_settings.percentage_per_deposit, NEW.amount;
    END IF;

    -- Mark commission as paid
    UPDATE deposits
    SET referral_commission_paid = true
    WHERE id = NEW.id;

    -- Mark referral as completed if max deposits reached
    IF v_referral.deposits_tracked >= v_settings.max_earnings_count THEN
        UPDATE referrals
        SET status = 'completed'
        WHERE id = v_referral.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process deposit rewards
DROP TRIGGER IF EXISTS process_deposit_rewards_trigger ON deposits;
CREATE TRIGGER process_deposit_rewards_trigger
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION process_deposit_rewards();

-- ============================================
-- STEP 14: HELPER FUNCTIONS
-- ============================================

-- Function to get user's referral stats
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id UUID)
RETURNS TABLE (
    total_referrals INTEGER,
    active_referrals INTEGER,
    total_points_earned INTEGER,
    total_money_earned DECIMAL(10,2),
    referral_code VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(r.id)::INTEGER as total_referrals,
        COUNT(r.id) FILTER (WHERE r.status = 'active')::INTEGER as active_referrals,
        COALESCE(SUM(r.total_points_earned), 0)::INTEGER as total_points_earned,
        COALESCE(SUM(r.total_percentage_earned), 0)::DECIMAL(10,2) as total_money_earned,
        u.referral_code
    FROM users u
    LEFT JOIN referrals r ON r.referrer_id = u.id
    WHERE u.id = p_user_id
    GROUP BY u.id, u.referral_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 15: GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON referral_settings TO authenticated, service_role;
GRANT ALL ON referrals TO authenticated, service_role;
GRANT ALL ON deposits TO authenticated, service_role;
GRANT ALL ON referral_earnings TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION track_referral(UUID, VARCHAR) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_deposit_rewards() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_referral_stats(UUID) TO authenticated, service_role;

-- ============================================
-- STEP 16: VERIFICATION
-- ============================================

SELECT '✅ Referral system created successfully!' as status;

-- Show current settings
SELECT
    '📊 Default Referral Settings:' as info,
    points_per_signup as "Points per Signup",
    points_per_deposit as "Points per Deposit",
    percentage_per_deposit as "Percentage per Deposit (%)",
    max_earnings_count as "Max Earnings Count",
    min_deposit_amount as "Min Deposit Amount ($)",
    is_enabled as "System Enabled"
FROM referral_settings;

-- Show tables created
SELECT
    '📋 Tables Created:' as info,
    table_name
FROM information_schema.tables
WHERE table_name IN ('referral_settings', 'referrals', 'deposits', 'referral_earnings')
ORDER BY table_name;

-- Show functions created
SELECT
    '⚙️ Functions Created:' as info,
    routine_name as function_name
FROM information_schema.routines
WHERE routine_name IN (
    'generate_referral_code',
    'track_referral',
    'process_deposit_rewards',
    'get_referral_stats'
)
ORDER BY routine_name;

SELECT '🎉 Referral system ready! Users will earn from their referrals deposits.' as message;
