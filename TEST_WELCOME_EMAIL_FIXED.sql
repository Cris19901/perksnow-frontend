-- ============================================================================
-- TEST WELCOME EMAIL - FIXED VERSION
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if pg_net extension is enabled
-- ============================================================================

SELECT 'Step 1: Checking pg_net extension...' as step;
SELECT
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
  THEN '✅ pg_net is ENABLED'
  ELSE '❌ pg_net is NOT ENABLED'
  END as pg_net_status;

-- ============================================================================
-- STEP 2: Check current triggers on users table
-- ============================================================================

SELECT 'Step 2: Checking triggers on users table...' as step;
SELECT trigger_name, action_timing, event_manipulation
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
-- STEP 5: Check pg_net table structure
-- ============================================================================

SELECT 'Step 5: Checking pg_net tables...' as step;
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'net'
ORDER BY table_name, ordinal_position;

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

-- ============================================================================
-- STEP 6: MANUAL TEST - Send a test email
-- Uncomment and run this block separately with YOUR email:
-- ============================================================================

/*
SELECT net.http_post(
  url := 'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYwMTgzODQsImV4cCI6MjA1MTU5NDM4NH0.lLiwLmONQp-IDfbJkQJIRCJeaCn_xGmtB9MVPD4i_Dg'
  ),
  body := jsonb_build_object(
    'type', 'welcome',
    'email', 'YOUR-EMAIL@example.com',
    'username', 'TestUser',
    'referral_code', 'TESTCODE'
  )
) as request_id;
*/
