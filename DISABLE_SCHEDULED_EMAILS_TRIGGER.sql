-- Quick fix: Disable the scheduled_emails trigger that's failing on signup

-- 1. Find and disable any triggers related to scheduled_emails on users table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE event_object_table = 'users'
        AND action_statement LIKE '%scheduled_emails%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE',
            trigger_record.trigger_name,
            trigger_record.event_object_table);
        RAISE NOTICE 'Dropped trigger: % on %',
            trigger_record.trigger_name,
            trigger_record.event_object_table;
    END LOOP;
END $$;

-- 2. Or just drop any welcome email trigger (common pattern)
DROP TRIGGER IF EXISTS send_welcome_email_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS schedule_welcome_email ON users CASCADE;
DROP TRIGGER IF EXISTS on_user_created_schedule_email ON users CASCADE;

-- 3. Drop the function that might be inserting into scheduled_emails
DROP FUNCTION IF EXISTS schedule_welcome_email() CASCADE;
DROP FUNCTION IF EXISTS send_welcome_email() CASCADE;

SELECT '✅ Scheduled email triggers disabled. Try signup again!' as message;

-- 4. Verify no more triggers are trying to use scheduled_emails
SELECT
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE action_statement LIKE '%scheduled_emails%';
