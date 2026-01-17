-- ============================================================================
-- UPDATE WELCOME EMAIL TRIGGER WITH CORRECT ANON KEY
-- Run this after testing that emails work
-- ============================================================================

-- First, get your anon key from Supabase Dashboard -> Settings -> API
-- Replace YOUR_ANON_KEY below with your actual anon key

-- ============================================================================
-- STEP 1: Store the anon key in database settings (secure way)
-- ============================================================================

-- Your actual anon key
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY';

-- Reload config to apply immediately
SELECT pg_reload_conf();

-- ============================================================================
-- STEP 2: Drop and recreate the welcome email function with correct key
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_send_welcome_email ON users;
DROP FUNCTION IF EXISTS send_welcome_email_on_signup() CASCADE;

CREATE OR REPLACE FUNCTION send_welcome_email_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
  v_anon_key text;
BEGIN
  -- Get the anon key from database settings
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- Fallback to hardcoded key if setting not found
  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY';
  END IF;

  -- Make async HTTP request to Edge Function
  BEGIN
    SELECT net.http_post(
      url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
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
