-- ============================================================================
-- EMAIL NOTIFICATION TRIGGERS - USING WRAPPER FUNCTION
-- Automatically send emails for referral and withdrawal events
-- ============================================================================

-- ============================================================================
-- 1. WELCOME EMAIL - Triggered when a new user is created
-- ============================================================================

CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Call our wrapper function to send email
  PERFORM public.send_edge_function_email(
    'welcome',
    v_user_email,
    NEW.username,
    jsonb_build_object('referral_code', NEW.referral_code)
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to send welcome email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_welcome_email ON users;
CREATE TRIGGER trigger_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();

-- ============================================================================
-- 2. REFERRAL SIGNUP EMAIL - When someone signs up with referral code
-- ============================================================================

CREATE OR REPLACE FUNCTION send_referral_signup_email()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_email TEXT;
  v_referrer_name TEXT;
  v_referred_username TEXT;
BEGIN
  -- Get referrer details
  SELECT u.email, p.username
  INTO v_referrer_email, v_referrer_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.referrer_id;

  -- Get referred user's username
  SELECT username INTO v_referred_username
  FROM users WHERE id = NEW.referee_id;

  -- Call wrapper function
  PERFORM public.send_edge_function_email(
    'referral_signup',
    v_referrer_email,
    v_referrer_name,
    jsonb_build_object(
      'referred_username', v_referred_username,
      'points_earned', 20
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send referral signup email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_referral_signup_email ON referrals;
CREATE TRIGGER trigger_referral_signup_email
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION send_referral_signup_email();

-- ============================================================================
-- 3. WITHDRAWAL REQUEST EMAIL - When user requests withdrawal
-- ============================================================================

CREATE OR REPLACE FUNCTION send_withdrawal_request_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user details
  SELECT u.email, p.username
  INTO v_user_email, v_user_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.user_id;

  -- Call wrapper function
  PERFORM public.send_edge_function_email(
    'withdrawal_request',
    v_user_email,
    v_user_name,
    jsonb_build_object(
      'withdrawal_amount', NEW.amount,
      'bank_name', NEW.bank_name,
      'account_number', NEW.account_number
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send withdrawal request email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_withdrawal_request_email ON wallet_withdrawals;
CREATE TRIGGER trigger_withdrawal_request_email
  AFTER INSERT ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_request_email();

-- ============================================================================
-- 4. WITHDRAWAL STATUS CHANGE EMAIL - When status changes
-- ============================================================================

CREATE OR REPLACE FUNCTION send_withdrawal_status_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_email_type TEXT;
BEGIN
  -- Only send email for completed or rejected status
  IF NEW.status NOT IN ('completed', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Don't send email if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get user details
  SELECT u.email, p.username
  INTO v_user_email, v_user_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.user_id;

  -- Determine email type
  v_email_type := CASE
    WHEN NEW.status = 'completed' THEN 'withdrawal_completed'
    WHEN NEW.status = 'rejected' THEN 'withdrawal_rejected'
  END;

  -- Call wrapper function
  PERFORM public.send_edge_function_email(
    v_email_type,
    v_user_email,
    v_user_name,
    jsonb_build_object(
      'withdrawal_amount', NEW.amount,
      'bank_name', NEW.bank_name,
      'account_number', NEW.account_number,
      'admin_notes', COALESCE(NEW.admin_notes, '')
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send withdrawal status email: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_withdrawal_status_email ON wallet_withdrawals;
CREATE TRIGGER trigger_withdrawal_status_email
  AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_status_email();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION send_welcome_email TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_referral_signup_email TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_withdrawal_request_email TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_withdrawal_status_email TO authenticated, anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%email%'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Email Triggers - INSTALLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Automated emails configured for:';
  RAISE NOTICE '  ✓ New user signups (welcome email)';
  RAISE NOTICE '  ✓ Referral signups (20 points earned)';
  RAISE NOTICE '  ✓ Withdrawal requests (confirmation)';
  RAISE NOTICE '  ✓ Withdrawal completed (success notice)';
  RAISE NOTICE '  ✓ Withdrawal rejected (rejection notice)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email system is LIVE!';
  RAISE NOTICE '========================================';
END $$;
