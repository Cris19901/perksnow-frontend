-- ============================================================================
-- FIX WELCOME EMAIL TRIGGER
-- Uses direct HTTP call via pg_net extension
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

SELECT 'Current triggers on users:' as info;
SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Check if pg_net extension exists
SELECT 'pg_net extension status:' as info;
SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
) as pg_net_exists;

-- Check if http extension exists
SELECT 'http extension status:' as info;
SELECT EXISTS (
  SELECT 1 FROM pg_extension WHERE extname = 'http'
) as http_exists;

-- ============================================================================
-- STEP 2: Enable pg_net extension (Supabase's preferred HTTP client)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- STEP 3: Drop old email trigger and function
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_send_welcome_email ON users;
DROP TRIGGER IF EXISTS trigger_welcome_email ON users;
DROP FUNCTION IF EXISTS send_welcome_email_on_signup() CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email_safe() CASCADE;

-- ============================================================================
-- STEP 4: Create welcome email function using pg_net
-- ============================================================================

CREATE OR REPLACE FUNCTION send_welcome_email_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_request_id bigint;
  v_service_role_key text;
BEGIN
  -- Get the service role key from vault (if available) or use anon key
  -- For Supabase Edge Functions, we need the anon key in the Authorization header
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- If not set, try to get from vault
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    BEGIN
      SELECT decrypted_secret INTO v_service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'service_role_key'
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_service_role_key := NULL;
    END;
  END IF;

  -- Make async HTTP request to Edge Function
  BEGIN
    SELECT net.http_post(
      url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(v_service_role_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMTgzODQsImV4cCI6MjA1MTU5NDM4NH0.lLiwLmONQp-IDfbJkQJIRCJeaCn_xGmtB9MVPD4i_Dg')
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
-- STEP 5: Create the trigger (AFTER INSERT)
-- ============================================================================

CREATE TRIGGER trigger_send_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_on_signup();

-- ============================================================================
-- STEP 6: Verify setup
-- ============================================================================

SELECT 'Final triggers on users:' as info;
SELECT trigger_name, action_timing || ' ' || event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- ============================================================================
-- STEP 7: Test the function manually (optional - uncomment to test)
-- ============================================================================

-- This will send a test email to see if the edge function works
-- Uncomment and run separately to test:

/*
SELECT net.http_post(
  url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMTgzODQsImV4cCI6MjA1MTU5NDM4NH0.lLiwLmONQp-IDfbJkQJIRCJeaCn_xGmtB9MVPD4i_Dg'
  ),
  body := jsonb_build_object(
    'type', 'welcome',
    'email', 'your-test-email@example.com',
    'username', 'TestUser',
    'referral_code', 'TESTCODE'
  )
);
*/

SELECT 'Done! Welcome email trigger has been set up.' as status;
SELECT 'Test by creating a new account. Check Supabase logs if email not received.' as next_steps;
