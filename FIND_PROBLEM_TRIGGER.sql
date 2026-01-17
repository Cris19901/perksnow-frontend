-- Find the exact trigger causing the scheduled_emails error

-- 1. List all triggers on users table with their names only
SELECT
    tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users'
AND tgname NOT LIKE 'RI_%';

-- 2. Find functions that reference scheduled_emails
SELECT
    proname as function_name
FROM pg_proc
WHERE prosrc LIKE '%scheduled_emails%'
OR prosrc LIKE '%email_type%';

-- 3. If you see any trigger names above, manually drop them like this:
-- DROP TRIGGER trigger_name_here ON users CASCADE;
