-- ============================================================================
-- FIX ALL SIGNUP ISSUES
-- Run this to fix the "column does not exist" errors during signup
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to users table
-- ============================================================================

-- Add balance column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'balance'
  ) THEN
    ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0;
    RAISE NOTICE 'Added balance column';
  ELSE
    RAISE NOTICE 'balance column already exists';
  END IF;
END $$;

-- Add successful_withdrawals_count column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'successful_withdrawals_count'
  ) THEN
    ALTER TABLE users ADD COLUMN successful_withdrawals_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added successful_withdrawals_count column';
  ELSE
    RAISE NOTICE 'successful_withdrawals_count column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Remove ALL problematic triggers on users table
-- ============================================================================

DROP TRIGGER IF EXISTS send_welcome_email_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS schedule_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS on_user_created_schedule_email ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_schedule_welcome_emails ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_send_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON users CASCADE;

-- Drop the problematic functions
DROP FUNCTION IF EXISTS schedule_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS schedule_welcome_emails() CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email_safe() CASCADE;

-- ============================================================================
-- STEP 3: Fix scheduled_emails table if it exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'scheduled_emails'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'scheduled_emails' AND column_name = 'email_type'
    ) THEN
      ALTER TABLE scheduled_emails ADD COLUMN email_type TEXT DEFAULT 'welcome';
      RAISE NOTICE 'Added email_type column to scheduled_emails';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create SAFE signup bonus trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION award_signup_bonus()
RETURNS TRIGGER AS $$
BEGIN
  -- Safely add 15,000 points to user's balance
  BEGIN
    UPDATE users
    SET balance = COALESCE(balance, 0) + 15000
    WHERE id = NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not update balance: %', SQLERRM;
  END;

  -- Safely record the bonus in points_transactions
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not record points transaction: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Signup bonus error (non-fatal): %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_award_signup_bonus
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION award_signup_bonus();

-- ============================================================================
-- STEP 5: Create SAFE welcome email function (only if call_edge_function exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION send_welcome_email_safe()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_function_exists BOOLEAN;
BEGIN
  -- Check if call_edge_function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'call_edge_function'
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RETURN NEW;
  END IF;

  -- Get referral code
  SELECT referral_code INTO v_referral_code
  FROM users WHERE id = NEW.id;

  -- Call Edge Function
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not send welcome email: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Welcome email error (non-fatal): %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create welcome email trigger
CREATE TRIGGER trigger_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_safe();

-- ============================================================================
-- STEP 6: Award bonus to existing users who missed it
-- ============================================================================

UPDATE users
SET balance = COALESCE(balance, 0) + 15000
WHERE balance IS NULL OR balance = 0;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'balance column' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'balance'
  ) THEN 'OK' ELSE 'Missing' END as status
UNION ALL
SELECT 'successful_withdrawals_count column',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'successful_withdrawals_count'
  ) THEN 'OK' ELSE 'Missing' END;

-- Show triggers on users table
SELECT trigger_name, action_timing || ' ' || event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table = 'users';
