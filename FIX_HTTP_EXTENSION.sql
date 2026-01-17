-- ============================================================================
-- FIX HTTP EXTENSION FOR EMAIL SYSTEM
-- Run this in Supabase SQL Editor if you get "function http_post does not exist"
-- ============================================================================

-- Step 1: Drop extension if it exists (clean slate)
DROP EXTENSION IF EXISTS http CASCADE;

-- Step 2: Create extension in extensions schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Step 3: Grant permissions to all roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Step 4: Verify HTTP extension is installed correctly
SELECT
    extname as extension_name,
    nspname as schema_name,
    extversion as version
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'http';

-- Step 5: List all http functions available
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'extensions'
  AND p.proname LIKE '%http%'
ORDER BY p.proname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ HTTP Extension - FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Extension installed in extensions schema';
  RAISE NOTICE 'Permissions granted to all roles';
  RAISE NOTICE '========================================';
END $$;
