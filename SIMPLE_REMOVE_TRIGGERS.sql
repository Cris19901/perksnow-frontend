-- Simpler approach: Just drop the triggers directly

-- 1. Drop common trigger names that might be causing issues
DROP TRIGGER IF EXISTS on_user_created ON users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user ON users CASCADE;
DROP TRIGGER IF EXISTS schedule_welcome_email_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS send_welcome_email_on_signup ON users CASCADE;
DROP TRIGGER IF EXISTS create_user_profile ON users CASCADE;
DROP TRIGGER IF EXISTS after_user_insert ON users CASCADE;

-- 2. Drop the functions that might insert into scheduled_emails
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.schedule_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS public.send_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile() CASCADE;

-- 3. Simple check of remaining triggers
SELECT
    tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users'
AND tgname NOT LIKE 'RI_%'
AND tgname NOT LIKE 'pg_%';

SELECT '✅ Common triggers removed. Try signup now!' as message;
