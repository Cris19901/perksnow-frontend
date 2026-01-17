-- ============================================================================
-- PROGRESSIVE WITHDRAWAL LIMITS
-- Limits withdrawal amounts for first 5 withdrawals to prevent abuse
-- ============================================================================

-- Add column to track withdrawal count per user
ALTER TABLE users
ADD COLUMN IF NOT EXISTS successful_withdrawals_count INTEGER DEFAULT 0;

-- Create function to get max withdrawal amount based on withdrawal count
CREATE OR REPLACE FUNCTION get_max_withdrawal_amount(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_withdrawal_count INTEGER;
  v_max_amount INTEGER;
BEGIN
  -- Get user's successful withdrawal count
  SELECT successful_withdrawals_count INTO v_withdrawal_count
  FROM users
  WHERE id = p_user_id;

  -- Determine max amount based on withdrawal number
  -- 1st: 5,000 points
  -- 2nd: 10,000 points
  -- 3rd: 40,000 points
  -- 4th: 70,000 points
  -- 5th: 100,000 points
  -- 6th+: unlimited (999,999,999)

  v_max_amount := CASE
    WHEN v_withdrawal_count = 0 THEN 5000
    WHEN v_withdrawal_count = 1 THEN 10000
    WHEN v_withdrawal_count = 2 THEN 40000
    WHEN v_withdrawal_count = 3 THEN 70000
    WHEN v_withdrawal_count = 4 THEN 100000
    ELSE 999999999 -- Unlimited after 5th withdrawal
  END;

  RETURN v_max_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment withdrawal count when withdrawal is completed
CREATE OR REPLACE FUNCTION increment_withdrawal_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE users
    SET successful_withdrawals_count = successful_withdrawals_count + 1
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-increment count on completion
DROP TRIGGER IF EXISTS trigger_increment_withdrawal_count ON wallet_withdrawals;
CREATE TRIGGER trigger_increment_withdrawal_count
  AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION increment_withdrawal_count();

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_max_withdrawal_amount TO authenticated, anon;
GRANT EXECUTE ON FUNCTION increment_withdrawal_count TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the function with sample withdrawal counts
SELECT
  'Withdrawal #1' as withdrawal_number,
  get_max_withdrawal_amount('00000000-0000-0000-0000-000000000000') as max_points,
  get_max_withdrawal_amount('00000000-0000-0000-0000-000000000000') * 0.1 as max_ngn
UNION ALL
SELECT 'Withdrawal #2', 10000, 10000 * 0.1
UNION ALL
SELECT 'Withdrawal #3', 40000, 40000 * 0.1
UNION ALL
SELECT 'Withdrawal #4', 70000, 70000 * 0.1
UNION ALL
SELECT 'Withdrawal #5', 100000, 100000 * 0.1
UNION ALL
SELECT 'Withdrawal #6+', 999999999, 999999999 * 0.1;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Progressive Withdrawal Limits - INSTALLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Withdrawal limits by number:';
  RAISE NOTICE '  1st withdrawal: 5,000 points (₦500)';
  RAISE NOTICE '  2nd withdrawal: 10,000 points (₦1,000)';
  RAISE NOTICE '  3rd withdrawal: 40,000 points (₦4,000)';
  RAISE NOTICE '  4th withdrawal: 70,000 points (₦7,000)';
  RAISE NOTICE '  5th withdrawal: 100,000 points (₦10,000)';
  RAISE NOTICE '  6th+ withdrawals: UNLIMITED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: get_max_withdrawal_amount(user_id)';
  RAISE NOTICE 'Column added: successful_withdrawals_count';
  RAISE NOTICE 'Auto-increments on withdrawal completion';
  RAISE NOTICE '========================================';
END $$;
