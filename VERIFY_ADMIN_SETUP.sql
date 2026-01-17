-- ============================================================================
-- VERIFY ADMIN SETUP
-- ============================================================================
-- Run this to check if everything is set up correctly
-- ============================================================================

-- 1. Check if is_admin column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'is_admin';

-- 2. Check if app_settings table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'app_settings';

-- 3. Check if there are any admin users
SELECT id, email, username, is_admin
FROM users
WHERE is_admin = true;

-- 4. Check if settings exist in app_settings table
SELECT COUNT(*) as total_settings
FROM app_settings;

-- 5. View all settings if they exist
SELECT setting_key, setting_value, setting_category, description
FROM app_settings
ORDER BY setting_category, setting_key;

-- 6. Check RLS policies on app_settings
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'app_settings';
