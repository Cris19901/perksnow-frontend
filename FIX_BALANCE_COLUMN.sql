-- ============================================================================
-- FIX: Add missing 'balance' column to users table
-- Run this FIRST before running UNIFIED_WITHDRAWAL_SYSTEM.sql
-- ============================================================================

-- Add balance column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'balance'
  ) THEN
    ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0;
    RAISE NOTICE 'Added balance column to users table';
  ELSE
    RAISE NOTICE 'balance column already exists';
  END IF;
END $$;

-- Also ensure successful_withdrawals_count exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'successful_withdrawals_count'
  ) THEN
    ALTER TABLE users ADD COLUMN successful_withdrawals_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added successful_withdrawals_count column to users table';
  ELSE
    RAISE NOTICE 'successful_withdrawals_count column already exists';
  END IF;
END $$;

-- Verify the columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('balance', 'successful_withdrawals_count');

-- ============================================================================
-- Now fix the signup bonus trigger to handle missing column gracefully
-- ============================================================================

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
  WHEN undefined_column THEN
    -- Some column doesn't exist, skip
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN undefined_column THEN
  -- balance column doesn't exist, log and continue
  RAISE WARNING 'balance column does not exist in users table';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users;
CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- Award bonus to the user who just signed up (if they exist but have 0 balance)
-- ============================================================================

-- Give 15k bonus to any users with 0 or NULL balance who haven't received it
UPDATE users
SET balance = 15000
WHERE (balance IS NULL OR balance = 0)
AND id IN (
  SELECT id FROM users
  WHERE NOT EXISTS (
    SELECT 1 FROM points_transactions pt
    WHERE pt.user_id = users.id
    AND pt.transaction_type = 'signup_bonus'
  )
);

SELECT 'Fix applied. Balance column added and signup bonus trigger updated.' as result;
