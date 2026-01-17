-- ============================================================================
-- EMAIL NOTIFICATION TRIGGERS
-- Automatically send emails for referral and withdrawal events
-- ============================================================================

-- ============================================================================
-- 1. REFERRAL SIGNUP EMAIL
-- Triggered when a new referral is created (someone signs up with ref code)
-- ============================================================================

CREATE OR REPLACE FUNCTION send_referral_signup_email()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_email TEXT;
  v_referrer_name TEXT;
  v_referred_username TEXT;
  v_points_earned INTEGER;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Get Supabase URL and anon key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Get referrer details
  SELECT email, username
  INTO v_referrer_email, v_referrer_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.referrer_id;

  -- Get referred user's username
  SELECT username
  INTO v_referred_username
  FROM users
  WHERE id = NEW.referee_id;

  -- Points earned is typically 20 for signup
  v_points_earned := 20;

  -- Call Edge Function to send email
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', 'referral_signup',
      'data', jsonb_build_object(
        'to_email', v_referrer_email,
        'to_name', v_referrer_name,
        'referred_username', v_referred_username,
        'points_earned', v_points_earned
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_referral_signup_email ON referrals;
CREATE TRIGGER trigger_referral_signup_email
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION send_referral_signup_email();

-- ============================================================================
-- 2. REFERRAL DEPOSIT EMAIL
-- Triggered when a referral earning is recorded (deposit tracked)
-- ============================================================================

CREATE OR REPLACE FUNCTION send_referral_deposit_email()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_email TEXT;
  v_referrer_name TEXT;
  v_referred_username TEXT;
  v_deposit_amount DECIMAL;
  v_points_earned INTEGER;
  v_commission_earned DECIMAL;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Only send email for deposit earnings (not signup bonus)
  IF NEW.earning_type != 'deposit' THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and anon key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Get referrer details
  SELECT email, username
  INTO v_referrer_email, v_referrer_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.referrer_id;

  -- Get referred user's username
  SELECT u.username
  INTO v_referred_username
  FROM users u
  JOIN referrals r ON r.referee_id = u.id
  WHERE r.referrer_id = NEW.referrer_id
  LIMIT 1;

  -- Get earnings details
  v_deposit_amount := NEW.deposit_amount;
  v_points_earned := NEW.points_earned;
  v_commission_earned := NEW.percentage_earned;

  -- Call Edge Function to send email
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', 'referral_deposit',
      'data', jsonb_build_object(
        'to_email', v_referrer_email,
        'to_name', v_referrer_name,
        'referred_username', v_referred_username,
        'deposit_amount', v_deposit_amount,
        'points_earned', v_points_earned,
        'commission_earned', v_commission_earned
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_referral_deposit_email ON referral_earnings;
CREATE TRIGGER trigger_referral_deposit_email
  AFTER INSERT ON referral_earnings
  FOR EACH ROW
  EXECUTE FUNCTION send_referral_deposit_email();

-- ============================================================================
-- 3. WITHDRAWAL REQUEST EMAIL
-- Triggered when a new withdrawal request is created
-- ============================================================================

CREATE OR REPLACE FUNCTION send_withdrawal_request_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Get Supabase URL and anon key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Get user details
  SELECT email, username
  INTO v_user_email, v_user_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.user_id;

  -- Call Edge Function to send email
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', 'withdrawal_request',
      'data', jsonb_build_object(
        'to_email', v_user_email,
        'to_name', v_user_name,
        'withdrawal_amount', NEW.amount,
        'withdrawal_id', NEW.id,
        'bank_name', NEW.bank_name,
        'account_number', NEW.account_number
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_withdrawal_request_email ON wallet_withdrawals;
CREATE TRIGGER trigger_withdrawal_request_email
  AFTER INSERT ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_request_email();

-- ============================================================================
-- 4. WITHDRAWAL STATUS CHANGE EMAIL
-- Triggered when withdrawal status changes to completed or rejected
-- ============================================================================

CREATE OR REPLACE FUNCTION send_withdrawal_status_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_email_type TEXT;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Only send email for completed or rejected status
  IF NEW.status NOT IN ('completed', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Don't send email if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and anon key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Get user details
  SELECT email, username
  INTO v_user_email, v_user_name
  FROM auth.users u
  JOIN users p ON u.id = p.id
  WHERE p.id = NEW.user_id;

  -- Determine email type
  v_email_type := CASE
    WHEN NEW.status = 'completed' THEN 'withdrawal_completed'
    WHEN NEW.status = 'rejected' THEN 'withdrawal_rejected'
  END;

  -- Call Edge Function to send email
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', v_email_type,
      'data', jsonb_build_object(
        'to_email', v_user_email,
        'to_name', v_user_name,
        'withdrawal_amount', NEW.amount,
        'withdrawal_id', NEW.id,
        'bank_name', NEW.bank_name,
        'account_number', NEW.account_number,
        'admin_notes', NEW.admin_notes
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_withdrawal_status_email ON wallet_withdrawals;
CREATE TRIGGER trigger_withdrawal_status_email
  AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_status_email();

-- ============================================================================
-- 5. WELCOME EMAIL
-- Triggered when a new user is created
-- ============================================================================

CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_referral_code TEXT;
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
BEGIN
  -- Get Supabase URL and anon key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Get user email from auth.users
  SELECT email
  INTO v_user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Get user details from users table
  v_user_name := NEW.username;
  v_referral_code := NEW.referral_code;

  -- Call Edge Function to send email
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := jsonb_build_object(
      'type', 'welcome',
      'data', jsonb_build_object(
        'to_email', v_user_email,
        'to_name', v_user_name,
        'referral_code', v_referral_code
      )
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_welcome_email ON users;
CREATE TRIGGER trigger_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION send_referral_signup_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_referral_deposit_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_withdrawal_request_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_withdrawal_status_email TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if triggers were created
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_referral_signup_email',
  'trigger_referral_deposit_email',
  'trigger_withdrawal_request_email',
  'trigger_withdrawal_status_email',
  'trigger_welcome_email'
)
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Email Notification Triggers - INSTALLED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email triggers configured for:';
  RAISE NOTICE '✓ Referral signups';
  RAISE NOTICE '✓ Referral deposits';
  RAISE NOTICE '✓ Withdrawal requests';
  RAISE NOTICE '✓ Withdrawal status changes';
  RAISE NOTICE '✓ Welcome emails';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANT: Configure environment variables:';
  RAISE NOTICE '1. Set app.settings.supabase_url';
  RAISE NOTICE '2. Set app.settings.supabase_anon_key';
  RAISE NOTICE '3. Deploy Edge Function: send-email';
  RAISE NOTICE '4. Set ZEPTOMAIL_API_KEY in Edge Function';
  RAISE NOTICE '========================================';
END $$;
