-- ============================================================================
-- CONFIGURE DATABASE SETTINGS FOR EMAIL SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Set Supabase URL
ALTER DATABASE postgres
SET app.settings.supabase_url = 'https://kswknblwjlkgxgvypkmo.supabase.co';

-- Step 2: Set Anon Key
ALTER DATABASE postgres
SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY';

-- Step 3: Verify settings are configured
SHOW app.settings.supabase_url;
SHOW app.settings.supabase_anon_key;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Database Settings - CONFIGURED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Supabase URL: https://kswknblwjlkgxgvypkmo.supabase.co';
  RAISE NOTICE 'Anon Key: Configured (hidden for security)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now test the email system!';
  RAISE NOTICE '========================================';
END $$;
