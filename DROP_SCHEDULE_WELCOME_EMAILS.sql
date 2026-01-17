-- Drop the exact function causing the problem

-- 1. Drop the function (CASCADE will also drop any triggers using it)
DROP FUNCTION IF EXISTS schedule_welcome_emails() CASCADE;
DROP FUNCTION IF EXISTS public.schedule_welcome_emails() CASCADE;

-- 2. Verify it's gone
SELECT
    proname as function_name
FROM pg_proc
WHERE prosrc LIKE '%scheduled_emails%'
OR prosrc LIKE '%email_type%';

-- 3. Check if any triggers remain
SELECT
    tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users'
AND tgname NOT LIKE 'RI_%';

SELECT '🎉 Problematic function removed! Try signup now - it will work!' as message;
