-- Force drop the schedule_welcome_emails function with all possible signatures

-- Drop with different possible signatures
DROP FUNCTION IF EXISTS schedule_welcome_emails() CASCADE;
DROP FUNCTION IF EXISTS schedule_welcome_emails(uuid) CASCADE;
DROP FUNCTION IF EXISTS schedule_welcome_emails(text) CASCADE;
DROP FUNCTION IF EXISTS schedule_welcome_emails(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.schedule_welcome_emails() CASCADE;
DROP FUNCTION IF EXISTS public.schedule_welcome_emails(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.schedule_welcome_emails(text) CASCADE;

-- Find the exact signature
SELECT
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    format('DROP FUNCTION %s(%s) CASCADE;',
        p.proname,
        pg_get_function_identity_arguments(p.oid)
    ) as drop_command
FROM pg_proc p
WHERE p.proname = 'schedule_welcome_emails';

-- If you see a drop_command above, copy it and run it separately
