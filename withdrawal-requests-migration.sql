-- Create withdrawal_requests table
-- This table tracks user requests to convert points to currency and withdraw

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_points INTEGER NOT NULL CHECK (amount_points > 0),
  amount_currency DECIMAL(10, 2) NOT NULL CHECK (amount_currency > 0),
  conversion_rate DECIMAL(10, 4) NOT NULL, -- Points needed per 1 currency unit
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('bank', 'opay')),
  account_details JSONB NOT NULL, -- Flexible storage for account information
  user_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_created_at ON withdrawal_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawals" ON withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create own withdrawals" ON withdrawal_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests (to cancel)
CREATE POLICY "Users can update own pending withdrawals" ON withdrawal_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON withdrawal_requests TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_withdrawal_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_withdrawal_requests_updated_at
  BEFORE UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_withdrawal_requests_updated_at();

-- Create function to process withdrawal and deduct points
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
  -- Get request details
  SELECT user_id, amount_points, status
  INTO v_user_id, v_amount_points, v_current_status
  FROM withdrawal_requests
  WHERE id = p_request_id;

  -- Check if request exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Check if request is still pending
  IF v_current_status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal request has already been processed';
  END IF;

  -- If approving, check user has sufficient points
  IF p_new_status = 'approved' OR p_new_status = 'completed' THEN
    SELECT points_balance INTO v_current_balance
    FROM users
    WHERE id = v_user_id;

    IF v_current_balance < v_amount_points THEN
      RAISE EXCEPTION 'Insufficient points balance';
    END IF;

    -- Deduct points from user
    UPDATE users
    SET points_balance = points_balance - v_amount_points
    WHERE id = v_user_id;

    -- Record transaction
    INSERT INTO points_transactions (user_id, amount, transaction_type, activity)
    VALUES (v_user_id, v_amount_points, 'redeem', 'Points withdrawn: ' || p_admin_notes);
  END IF;

  -- Update withdrawal request
  UPDATE withdrawal_requests
  SET
    status = p_new_status,
    admin_notes = p_admin_notes,
    processed_at = NOW(),
    processed_by = auth.uid()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_withdrawal_request TO authenticated;
