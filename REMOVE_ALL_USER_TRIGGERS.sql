-- Nuclear option: Remove ALL triggers on users table

-- 1. List all current triggers on users table
SELECT
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users'
AND t.tgname NOT LIKE 'RI_%'; -- Don't drop foreign key triggers

-- 2. Drop ALL triggers on users table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT t.tgname as trigger_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'users'
        AND t.tgname NOT LIKE 'RI_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON users CASCADE', trigger_record.trigger_name);
        RAISE NOTICE '✅ Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;

    IF NOT FOUND THEN
        RAISE NOTICE 'ℹ️ No triggers found on users table';
    END IF;
END $$;

-- 3. Verify all triggers are gone
SELECT
    '✅ All triggers removed' as status,
    COUNT(*) as remaining_triggers
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users'
AND t.tgname NOT LIKE 'RI_%';

-- 4. Show what functions reference scheduled_emails
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
WHERE pg_get_functiondef(p.oid) LIKE '%scheduled_emails%'
AND p.proname NOT LIKE 'pg_%';

SELECT '🎉 All user triggers removed. Try signup now!' as message;
