-- ============================================================================
-- TEST EMAIL SYSTEM AFTER REDEPLOY
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Send a test welcome email
SELECT public.send_edge_function_email(
  'welcome',
  'fadiscojay@gmail.com',
  'Test User',
  jsonb_build_object('referral_code', 'TEST123')
);

-- ============================================================================
-- WHAT TO EXPECT
-- ============================================================================
-- If successful:
--   {"status": 200, "response": "{\"success\":true}"}
--
-- If failed:
--   {"status": 200, "response": "{\"success\":false}"}
--
-- Then check Edge Function logs at:
-- https://supabase.com/dashboard/project/kswknblwjlkgxgvypkmo/functions/send-email/logs
-- ============================================================================
