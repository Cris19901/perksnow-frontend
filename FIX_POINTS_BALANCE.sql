-- ============================================================================
-- FIX: Frontend uses 'points_balance' not 'balance'
-- ============================================================================

-- Check what columns exist
SELECT 'Columns in users table related to balance/points:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND (column_name LIKE '%balance%' OR column_name LIKE '%point%');

-- ============================================================================
-- Add points_balance column if it doesn't exist
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 15000;

-- ============================================================================
-- Update ALL users to have 15000 in points_balance
-- ============================================================================

UPDATE users SET points_balance = 15000;

-- ============================================================================
-- Also sync balance column for consistency
-- ============================================================================

UPDATE users SET balance = 15000 WHERE balance IS NULL OR balance = 0;

-- ============================================================================
-- Update the trigger to set points_balance instead of balance
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users;
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Set BOTH balance columns
  NEW.balance := 15000;
  NEW.points_balance := 15000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_award_signup_bonus
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- Set default for points_balance column
-- ============================================================================

ALTER TABLE users ALTER COLUMN points_balance SET DEFAULT 15000;

-- ============================================================================
-- Verify
-- ============================================================================

SELECT 'Users after fix:' as info;
SELECT id, username, balance, points_balance
FROM users
ORDER BY created_at DESC
LIMIT 10;
