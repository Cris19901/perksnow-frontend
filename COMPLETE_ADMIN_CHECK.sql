-- ============================================================================
-- COMPLETE ADMIN DIAGNOSTIC CHECK
-- ============================================================================

-- Check 1: Does is_admin column exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    RAISE NOTICE '✅ is_admin column EXISTS';
  ELSE
    RAISE NOTICE '❌ is_admin column DOES NOT EXIST';
  END IF;
END $$;

-- Check 2: Does app_settings table exist?
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'app_settings'
  ) THEN
    RAISE NOTICE '✅ app_settings table EXISTS';
  ELSE
    RAISE NOTICE '❌ app_settings table DOES NOT EXIST';
  END IF;
END $$;

-- Check 3: Count settings in app_settings
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM app_settings;
  RAISE NOTICE '📊 Total settings in app_settings: %', v_count;

  IF v_count = 0 THEN
    RAISE NOTICE '❌ WARNING: app_settings table is EMPTY! Run the INSERT statements from ADMIN_SETTINGS_MIGRATION.sql';
  END IF;
END $$;

-- Check 4: List all settings
SELECT
  '📋 Current Settings:' as info,
  setting_key,
  setting_value,
  setting_category,
  description
FROM app_settings
ORDER BY setting_category, setting_key;

-- Check 5: Check for admin users
SELECT
  '👤 Admin Users:' as info,
  id,
  email,
  username,
  is_admin
FROM users
WHERE is_admin = true;

-- Check 6: If no admin users exist, show how to create one
DO $$
DECLARE
  v_admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_admin_count FROM users WHERE is_admin = true;

  IF v_admin_count = 0 THEN
    RAISE NOTICE '❌ WARNING: No admin users found!';
    RAISE NOTICE '💡 To create an admin, run: UPDATE users SET is_admin = true WHERE email = ''your-email@example.com'';';
  ELSE
    RAISE NOTICE '✅ Found % admin user(s)', v_admin_count;
  END IF;
END $$;
