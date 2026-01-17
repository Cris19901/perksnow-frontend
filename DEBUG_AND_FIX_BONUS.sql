-- ============================================================================
-- DEBUG AND FIX SIGNUP BONUS
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state of triggers
-- ============================================================================

SELECT 'Current triggers on users table:' as info;
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- ============================================================================
-- STEP 2: Check if balance column exists and its type
-- ============================================================================

SELECT 'Balance column info:' as info;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'balance';

-- ============================================================================
-- STEP 3: Check current users and their balances
-- ============================================================================

SELECT 'Recent users:' as info;
SELECT id, username, email, balance, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 4: Check if the function exists
-- ============================================================================

SELECT 'Function exists:' as info;
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'award_signup_bonus';

-- ============================================================================
-- STEP 5: Manually update ALL users to have 15000 balance RIGHT NOW
-- ============================================================================

UPDATE users SET balance = 15000;

SELECT 'After manual update:' as info;
SELECT id, username, balance FROM users ORDER BY created_at DESC LIMIT 5;

-- ============================================================================
-- STEP 6: Drop and recreate trigger with BEFORE INSERT instead of AFTER
-- BEFORE INSERT can modify NEW directly
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users;
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

-- Try BEFORE INSERT trigger that sets the value directly
CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Set balance directly in the NEW record before insert
  NEW.balance := 15000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_award_signup_bonus
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- STEP 7: Also set a default value on the column itself as backup
-- ============================================================================

ALTER TABLE users ALTER COLUMN balance SET DEFAULT 15000;

-- ============================================================================
-- STEP 8: Verify final state
-- ============================================================================

SELECT 'Final trigger state:' as info;
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

SELECT 'Column default:' as info;
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'balance';

SELECT 'All users should now have 15000:' as info;
SELECT id, username, balance FROM users ORDER BY created_at DESC LIMIT 10;
