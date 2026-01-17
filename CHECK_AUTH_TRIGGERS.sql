-- Check for auth-related triggers that might be failing

-- 1. Check ALL triggers on users table
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
ORDER BY trigger_name;

-- 2. Check for functions related to user creation
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%user%'
OR routine_name LIKE '%handle%auth%'
OR routine_name LIKE '%public%'
ORDER BY routine_name;

-- 3. Check if there's a handle_new_user function (common Supabase pattern)
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%user%';

-- 4. List all triggers in the database
SELECT
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'users';
