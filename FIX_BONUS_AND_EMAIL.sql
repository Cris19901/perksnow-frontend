-- ============================================================================
-- FIX SIGNUP BONUS AND WELCOME EMAIL
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

SELECT 'Current triggers on users:' as info;
SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users';

SELECT 'Users with balance:' as info;
SELECT id, username, email, balance, successful_withdrawals_count
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 2: Ensure columns exist and have correct defaults
-- ============================================================================

-- Add columns if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS successful_withdrawals_count INTEGER DEFAULT 0;

-- Set default for existing NULL values
UPDATE users SET balance = 0 WHERE balance IS NULL;
UPDATE users SET successful_withdrawals_count = 0 WHERE successful_withdrawals_count IS NULL;

-- ============================================================================
-- STEP 3: Drop existing trigger and function
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users;
DROP FUNCTION IF EXISTS award_signup_bonus() CASCADE;

-- ============================================================================
-- STEP 4: Create improved signup bonus function with logging
-- ============================================================================

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that trigger fired
  RAISE LOG 'award_signup_bonus triggered for user: %', NEW.id;

  -- Update balance directly
  UPDATE users
  SET balance = 15000
  WHERE id = NEW.id;

  -- Log success
  RAISE LOG 'Updated balance to 15000 for user: %', NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- STEP 5: Create welcome email trigger (if call_edge_function exists)
-- ============================================================================

-- First check if call_edge_function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'call_edge_function'
) as call_edge_function_exists;

-- Drop old email function/trigger
DROP TRIGGER IF EXISTS trigger_welcome_email ON users;
DROP FUNCTION IF EXISTS send_welcome_email_safe() CASCADE;

-- Create welcome email function
CREATE OR REPLACE FUNCTION send_welcome_email_safe()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
BEGIN
  -- Get referral code
  v_referral_code := NEW.referral_code;

  -- Try to call edge function
  BEGIN
    PERFORM public.call_edge_function(
      'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
      jsonb_build_object(
        'type', 'welcome',
        'email', NEW.email,
        'username', COALESCE(NEW.username, 'User'),
        'referral_code', COALESCE(v_referral_code, 'LAVLAY')
      )
    );
    RAISE LOG 'Welcome email sent to: %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Could not send welcome email to %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_safe();

-- ============================================================================
-- STEP 6: Manually award bonus to users who missed it
-- ============================================================================

-- Award 15k to all users who have 0 balance
UPDATE users
SET balance = 15000
WHERE balance = 0 OR balance IS NULL;

-- ============================================================================
-- STEP 7: Verify setup
-- ============================================================================

SELECT 'Final triggers on users:' as info;
SELECT trigger_name, action_timing || ' ' || event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table = 'users';

SELECT 'Users after fix:' as info;
SELECT id, username, email, balance, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 8: Check if call_edge_function exists and show its definition
-- ============================================================================

SELECT 'call_edge_function status:' as info;
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'call_edge_function')
  THEN 'EXISTS' ELSE 'MISSING - emails will not work' END as status;
