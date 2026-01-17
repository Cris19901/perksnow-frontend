-- ============================================================================
-- WALLET WITHDRAWAL SYSTEM
-- For withdrawing referral earnings (wallet_balance) to bank account
-- ============================================================================

-- Create wallet_withdrawals table
CREATE TABLE IF NOT EXISTS wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Amount details
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),

  -- Bank details
  withdrawal_method TEXT NOT NULL DEFAULT 'bank' CHECK (withdrawal_method IN ('bank', 'opay', 'paystack')),
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,

  -- Additional info
  user_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id),

  -- Transaction reference
  transaction_reference TEXT UNIQUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user_id ON wallet_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON wallet_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_created_at ON wallet_withdrawals(created_at DESC);

-- Enable RLS
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawals
CREATE POLICY "Users can view own wallet withdrawals" ON wallet_withdrawals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own withdrawals
CREATE POLICY "Users can create own wallet withdrawals" ON wallet_withdrawals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending withdrawals (to cancel)
CREATE POLICY "Users can cancel own pending wallet withdrawals" ON wallet_withdrawals
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status IN ('pending', 'cancelled'));

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all wallet withdrawals" ON wallet_withdrawals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can update any withdrawal
CREATE POLICY "Admins can update wallet withdrawals" ON wallet_withdrawals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON wallet_withdrawals TO authenticated;

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wallet_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wallet_withdrawals_updated_at
  BEFORE UPDATE ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_withdrawals_updated_at();

-- ============================================================================
-- FUNCTION: Process wallet withdrawal
-- ============================================================================

CREATE OR REPLACE FUNCTION process_wallet_withdrawal(
  p_withdrawal_id UUID,
  p_new_status TEXT,
  p_admin_notes TEXT DEFAULT NULL,
  p_transaction_reference TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_amount DECIMAL(10, 2);
  v_current_status TEXT;
  v_current_wallet_balance DECIMAL(10, 2);
BEGIN
  -- Get withdrawal details
  SELECT user_id, amount, status
  INTO v_user_id, v_amount, v_current_status
  FROM wallet_withdrawals
  WHERE id = p_withdrawal_id;

  -- Check if withdrawal exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Check if withdrawal is still pending or processing
  IF v_current_status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal has already been processed';
  END IF;

  -- If completing, deduct from wallet balance
  IF p_new_status = 'completed' THEN
    -- Get current wallet balance
    SELECT wallet_balance INTO v_current_wallet_balance
    FROM users
    WHERE id = v_user_id;

    -- Check sufficient balance
    IF v_current_wallet_balance < v_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;

    -- Deduct from wallet
    UPDATE users
    SET wallet_balance = wallet_balance - v_amount
    WHERE id = v_user_id;

    -- Create transaction record in referral_earnings (negative)
    INSERT INTO referral_earnings (
      referrer_id,
      earning_type,
      percentage_earned,
      deposit_amount
    )
    VALUES (
      v_user_id,
      'withdrawal',
      -v_amount,
      0
    );
  END IF;

  -- Update withdrawal request
  UPDATE wallet_withdrawals
  SET
    status = p_new_status,
    admin_notes = p_admin_notes,
    transaction_reference = COALESCE(p_transaction_reference, transaction_reference),
    processed_at = NOW(),
    processed_by = auth.uid()
  WHERE id = p_withdrawal_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_wallet_withdrawal TO authenticated;

-- ============================================================================
-- FUNCTION: Get user withdrawal stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_withdrawal_stats(p_user_id UUID)
RETURNS TABLE (
  total_withdrawals BIGINT,
  total_amount DECIMAL(10, 2),
  pending_count BIGINT,
  completed_count BIGINT,
  rejected_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_withdrawals,
    COALESCE(SUM(amount), 0)::DECIMAL(10, 2) as total_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::BIGINT as pending_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT as completed_count,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END)::BIGINT as rejected_count
  FROM wallet_withdrawals
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_withdrawal_stats TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if table was created
SELECT 'wallet_withdrawals table' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'wallet_withdrawals'
  ) THEN '✅ Created' ELSE '❌ Missing' END as status;

-- Check if function was created
SELECT 'process_wallet_withdrawal function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'process_wallet_withdrawal'
  ) THEN '✅ Created' ELSE '❌ Missing' END as status;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Wallet Withdrawal System - INSTALLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now withdraw referral earnings';
  RAISE NOTICE 'Admins can approve/reject from admin panel';
  RAISE NOTICE 'Minimum withdrawal: Set in app (e.g., ₦1,000)';
  RAISE NOTICE '========================================';
END $$;
