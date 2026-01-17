-- Fix the scheduled_emails table issue

-- Option 1: Add the missing column
ALTER TABLE scheduled_emails
ADD COLUMN IF NOT EXISTS email_type TEXT;

-- Option 2: If scheduled_emails has a trigger, let's check and fix it
-- First, check what triggers are on scheduled_emails
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'scheduled_emails';

-- Check if there's a trigger on users that inserts into scheduled_emails
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND action_statement LIKE '%scheduled_emails%';

-- Check the structure of scheduled_emails
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'scheduled_emails'
ORDER BY ordinal_position;

SELECT '✅ Column added (if it was missing). Now check if there are triggers to fix.' as message;
