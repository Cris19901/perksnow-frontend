-- ============================================================================
-- UPDATE WELCOME EMAIL TRIGGER - SIMPLE VERSION
-- No database settings needed, key is hardcoded in function
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop existing trigger and function
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_send_welcome_email ON users;
DROP FUNCTION IF EXISTS send_welcome_email_on_signup() CASCADE;

-- ============================================================================
-- STEP 2: Create the welcome email function with hardcoded key
-- ============================================================================

CREATE OR REPLACE FUNCTION send_welcome_email_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
BEGIN
  -- Make async HTTP request to Edge Function
  BEGIN
    SELECT net.http_post(
      url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY'
      ),
      body := jsonb_build_object(
        'type', 'welcome',
        'email', NEW.email,
        'username', COALESCE(NEW.username, 'User'),
        'referral_code', COALESCE(NEW.referral_code, 'LAVLAY')
      )
    ) INTO v_request_id;

    RAISE LOG 'Welcome email request sent for user %, request_id: %', NEW.email, v_request_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail signup
    RAISE WARNING 'Failed to send welcome email for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create the trigger
-- ============================================================================

CREATE TRIGGER trigger_send_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_on_signup();

-- ============================================================================
-- STEP 4: Verify
-- ============================================================================

SELECT 'Trigger created successfully!' as status;
SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name = 'trigger_send_welcome_email';

SELECT 'Welcome emails will now be sent automatically when new users sign up!' as info;
