-- ============================================================================
-- UNIFIED WITHDRAWAL SYSTEM
-- Consolidates withdrawal_requests table with email triggers
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: ENSURE withdrawal_requests TABLE EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Amount details
  amount_points INTEGER NOT NULL CHECK (amount_points > 0),
  amount_currency DECIMAL(10, 2) NOT NULL CHECK (amount_currency > 0),
  conversion_rate DECIMAL(10, 6) NOT NULL DEFAULT 0.1, -- 10 points = 1 NGN

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),

  -- Withdrawal method
  withdrawal_method TEXT NOT NULL DEFAULT 'bank' CHECK (withdrawal_method IN ('bank', 'opay', 'paystack')),

  -- Account details stored as JSONB for flexibility
  account_details JSONB DEFAULT '{}',

  -- Notes
  user_notes TEXT,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can cancel own pending withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;

-- Create RLS policies
CREATE POLICY "Users can view own withdrawal requests" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own pending withdrawal requests" ON withdrawal_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status IN ('pending', 'cancelled'));

CREATE POLICY "Admins can view all withdrawal requests" ON withdrawal_requests
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

CREATE POLICY "Admins can update withdrawal requests" ON withdrawal_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON withdrawal_requests TO authenticated;

-- ============================================================================
-- PART 2: ADD PROGRESSIVE WITHDRAWAL LIMITS
-- ============================================================================

-- Add withdrawal count column to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'successful_withdrawals_count'
  ) THEN
    ALTER TABLE users ADD COLUMN successful_withdrawals_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to get max withdrawal amount based on withdrawal number
CREATE OR REPLACE FUNCTION get_max_withdrawal_amount(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_withdrawal_count INTEGER;
BEGIN
  -- Get user's successful withdrawal count
  SELECT COALESCE(successful_withdrawals_count, 0) INTO v_withdrawal_count
  FROM users WHERE id = p_user_id;

  -- Return max amount based on withdrawal number (in points)
  -- 1st withdrawal: 5,000 points (500 NGN)
  -- 2nd withdrawal: 10,000 points (1,000 NGN)
  -- 3rd withdrawal: 40,000 points (4,000 NGN)
  -- 4th withdrawal: 70,000 points (7,000 NGN)
  -- 5th withdrawal: 100,000 points (10,000 NGN)
  -- 6th+: Unlimited
  RETURN CASE
    WHEN v_withdrawal_count = 0 THEN 5000
    WHEN v_withdrawal_count = 1 THEN 10000
    WHEN v_withdrawal_count = 2 THEN 40000
    WHEN v_withdrawal_count = 3 THEN 70000
    WHEN v_withdrawal_count = 4 THEN 100000
    ELSE 999999999  -- Effectively unlimited after 5th withdrawal
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_max_withdrawal_amount TO authenticated;

-- ============================================================================
-- PART 3: ADMIN PROCESS WITHDRAWAL FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION process_withdrawal_request(
  p_request_id UUID,
  p_new_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_amount_points INTEGER;
  v_current_status TEXT;
  v_current_balance INTEGER;
BEGIN
  -- Get withdrawal request details
  SELECT user_id, amount_points, status
  INTO v_user_id, v_amount_points, v_current_status
  FROM withdrawal_requests
  WHERE id = p_request_id;

  -- Check if withdrawal exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Check if withdrawal is still pending
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal has already been processed';
  END IF;

  -- If completing/approving, deduct points from user balance
  IF p_new_status IN ('completed', 'approved') THEN
    -- Get current balance
    SELECT balance INTO v_current_balance
    FROM users
    WHERE id = v_user_id;

    -- Check sufficient balance
    IF v_current_balance < v_amount_points THEN
      RAISE EXCEPTION 'Insufficient points balance';
    END IF;

    -- Deduct points from user
    UPDATE users
    SET balance = balance - v_amount_points
    WHERE id = v_user_id;

    -- Record in points_transactions
    INSERT INTO points_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      status
    ) VALUES (
      v_user_id,
      -v_amount_points,
      'withdrawal',
      'Withdrawal of ' || v_amount_points || ' points',
      'completed'
    );

    -- Increment successful withdrawal count if completing
    IF p_new_status = 'completed' THEN
      UPDATE users
      SET successful_withdrawals_count = COALESCE(successful_withdrawals_count, 0) + 1
      WHERE id = v_user_id;
    END IF;
  END IF;

  -- Update withdrawal request
  UPDATE withdrawal_requests
  SET
    status = p_new_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    processed_at = NOW(),
    processed_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_withdrawal_request TO authenticated;

-- ============================================================================
-- PART 4: EMAIL TRIGGERS FOR WITHDRAWAL_REQUESTS
-- ============================================================================

-- Drop old triggers if they exist (from wallet_withdrawals)
DROP TRIGGER IF EXISTS trigger_withdrawal_request_email ON wallet_withdrawals;
DROP TRIGGER IF EXISTS trigger_withdrawal_status_email ON wallet_withdrawals;

-- Function to send email when withdrawal is requested
CREATE OR REPLACE FUNCTION send_withdrawal_request_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_username TEXT;
  v_phone TEXT;
  v_account_name TEXT;
  v_account_number TEXT;
  v_bank_name TEXT;
BEGIN
  -- Get user details
  SELECT email, username, phone INTO v_user_email, v_username, v_phone
  FROM users WHERE id = NEW.user_id;

  -- Extract account details from JSONB
  v_account_name := NEW.account_details->>'accountName';
  v_account_number := NEW.account_details->>'accountNumber';
  v_bank_name := NEW.account_details->>'bankName';

  -- Call the Edge Function to send email
  PERFORM public.call_edge_function(
    'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
    jsonb_build_object(
      'type', 'withdrawal_request',
      'email', v_user_email,
      'username', COALESCE(v_username, 'User'),
      'amount', NEW.amount_currency,
      'points', NEW.amount_points,
      'method', NEW.withdrawal_method,
      'accountName', COALESCE(v_account_name, 'N/A'),
      'accountNumber', COALESCE(v_account_number, 'N/A'),
      'bankName', COALESCE(v_bank_name, 'N/A')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send withdrawal request email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send email when withdrawal status changes
CREATE OR REPLACE FUNCTION send_withdrawal_status_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_username TEXT;
  v_account_name TEXT;
BEGIN
  -- Only send if status actually changed and is a final status
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('completed', 'approved', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get user details
  SELECT email, username INTO v_user_email, v_username
  FROM users WHERE id = NEW.user_id;

  -- Extract account name from JSONB
  v_account_name := NEW.account_details->>'accountName';

  -- Call the Edge Function to send email
  PERFORM public.call_edge_function(
    'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
    jsonb_build_object(
      'type', 'withdrawal_status',
      'email', v_user_email,
      'username', COALESCE(v_username, 'User'),
      'status', NEW.status,
      'amount', NEW.amount_currency,
      'points', NEW.amount_points,
      'adminNotes', NEW.admin_notes,
      'accountName', COALESCE(v_account_name, 'N/A')
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send withdrawal status email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on withdrawal_requests table
DROP TRIGGER IF EXISTS trigger_withdrawal_request_email ON withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_request_email
  AFTER INSERT ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_request_email();

DROP TRIGGER IF EXISTS trigger_withdrawal_status_email ON withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_status_email
  AFTER UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_status_email();

-- ============================================================================
-- PART 5: AUTO-INCREMENT WITHDRAWAL COUNT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_withdrawal_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'completed', increment the user's count
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE users
    SET successful_withdrawals_count = COALESCE(successful_withdrawals_count, 0) + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_increment_withdrawal_count ON withdrawal_requests;
CREATE TRIGGER trigger_increment_withdrawal_count
  AFTER UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_withdrawal_count();

-- ============================================================================
-- PART 6: SIGNUP BONUS SYSTEM (15,000 points)
-- ============================================================================

-- Function to award signup bonus
CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Add 15,000 points to user's balance
  UPDATE users
  SET balance = COALESCE(balance, 0) + 15000
  WHERE id = NEW.id;

  -- Record the bonus in points_transactions (if table exists)
  BEGIN
    INSERT INTO points_transactions (
      user_id,
      amount,
      transaction_type,
      description,
      status
    ) VALUES (
      NEW.id,
      15000,
      'signup_bonus',
      'Welcome bonus: 15,000 free withdrawable points',
      'completed'
    );
  EXCEPTION WHEN undefined_table THEN
    -- points_transactions table doesn't exist, skip
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for signup bonus (only if it doesn't exist)
DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users;
CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Withdrawal System Components' as section, 'Status' as status;

SELECT 'withdrawal_requests table' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawal_requests'
  ) THEN 'Created' ELSE 'Missing' END as status;

SELECT 'get_max_withdrawal_amount function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_max_withdrawal_amount'
  ) THEN 'Created' ELSE 'Missing' END as status;

SELECT 'process_withdrawal_request function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'process_withdrawal_request'
  ) THEN 'Created' ELSE 'Missing' END as status;

SELECT 'award_signup_bonus function' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines WHERE routine_name = 'award_signup_bonus'
  ) THEN 'Created' ELSE 'Missing' END as status;

SELECT 'successful_withdrawals_count column' as component,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'successful_withdrawals_count'
  ) THEN 'Created' ELSE 'Missing' END as status;

-- Show all triggers on withdrawal_requests
SELECT 'Triggers on withdrawal_requests:' as section;
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'withdrawal_requests';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE '  UNIFIED WITHDRAWAL SYSTEM - INSTALLATION COMPLETE';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '  Progressive Withdrawal Limits:';
  RAISE NOTICE '    1st: 5,000 pts (500 NGN)';
  RAISE NOTICE '    2nd: 10,000 pts (1,000 NGN)';
  RAISE NOTICE '    3rd: 40,000 pts (4,000 NGN)';
  RAISE NOTICE '    4th: 70,000 pts (7,000 NGN)';
  RAISE NOTICE '    5th: 100,000 pts (10,000 NGN)';
  RAISE NOTICE '    6th+: Unlimited';
  RAISE NOTICE '';
  RAISE NOTICE '  Signup Bonus: 15,000 points for new users';
  RAISE NOTICE '';
  RAISE NOTICE '  Email notifications enabled for:';
  RAISE NOTICE '    - Withdrawal requests';
  RAISE NOTICE '    - Withdrawal approvals/rejections';
  RAISE NOTICE '========================================================';
END $$;
