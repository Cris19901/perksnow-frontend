-- ============================================================================
-- TEST WELCOME EMAIL - Run this to diagnose and test email sending
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if pg_net extension is enabled
-- ============================================================================

SELECT 'Step 1: Checking pg_net extension...' as step;
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
  THEN '✅ pg_net is ENABLED'
  ELSE '❌ pg_net is NOT ENABLED - run: CREATE EXTENSION pg_net;'
  END as pg_net_status;

-- ============================================================================
-- STEP 2: Check current triggers on users table
-- ============================================================================

SELECT 'Step 2: Checking triggers on users table...' as step;
SELECT trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- ============================================================================
-- STEP 3: Check if the welcome email function exists
-- ============================================================================

SELECT 'Step 3: Checking welcome email function...' as step;
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_welcome_email_on_signup')
  THEN '✅ send_welcome_email_on_signup function EXISTS'
  ELSE '❌ send_welcome_email_on_signup function MISSING'
  END as function_status;

-- ============================================================================
-- STEP 4: Enable pg_net if not already enabled
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- STEP 5: TEST - Send a test email directly using pg_net
-- REPLACE 'your-email@example.com' WITH YOUR ACTUAL EMAIL!
-- ============================================================================

SELECT 'Step 5: Sending test email...' as step;
SELECT 'Replace the email below with your actual email and run this query:' as instruction;

-- Uncomment this block and replace the email to test:
/*
SELECT net.http_post(
  url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMTgzODQsImV4cCI6MjA1MTU5NDM4NH0.lLiwLmONQp-IDfbJkQJIRCJeaCn_xGmtB9MVPD4i_Dg'
  ),
  body := jsonb_build_object(
    'type', 'welcome',
    'email', 'YOUR-EMAIL@example.com',  -- <-- CHANGE THIS!
    'username', 'TestUser',
    'referral_code', 'TESTCODE'
  )
) as request_id;
*/

-- ============================================================================
-- STEP 6: Check recent HTTP requests made by pg_net
-- ============================================================================

SELECT 'Step 6: Checking recent pg_net requests...' as step;
SELECT id, method, url, status_code, created
FROM net._http_response
ORDER BY created DESC
LIMIT 10;

-- ============================================================================
-- STEP 7: Check for any errors in the response
-- ============================================================================

SELECT 'Step 7: Checking for error responses...' as step;
SELECT id, status_code, content::text as response_body, created
FROM net._http_response
WHERE status_code != 200 OR status_code IS NULL
ORDER BY created DESC
LIMIT 5;

-- ============================================================================
-- DIAGNOSIS SUMMARY
-- ============================================================================

SELECT '===================================' as separator;
SELECT 'DIAGNOSIS SUMMARY' as title;
SELECT '===================================' as separator;

SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
    THEN '❌ PROBLEM: pg_net extension not enabled. Run: CREATE EXTENSION pg_net;'
    WHEN NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_welcome_email_on_signup')
    THEN '❌ PROBLEM: Welcome email function missing. Run FIX_WELCOME_EMAIL_TRIGGER.sql'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_send_welcome_email' AND event_object_table = 'users')
    THEN '❌ PROBLEM: Welcome email trigger missing. Run FIX_WELCOME_EMAIL_TRIGGER.sql'
    ELSE '✅ Database setup looks correct. Check: 1) Edge Function deployed? 2) ZEPTOMAIL_API_KEY set in secrets?'
  END as diagnosis;
