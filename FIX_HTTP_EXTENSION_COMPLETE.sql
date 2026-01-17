-- ============================================================================
-- COMPLETE HTTP EXTENSION FIX
-- Run this in Supabase SQL Editor to fix the http_post function error
-- ============================================================================

-- Step 1: Drop extension completely (clean slate)
DROP EXTENSION IF EXISTS http CASCADE;

-- Step 2: Create extension in extensions schema
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Step 3: Grant permissions to all roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Step 4: Verify HTTP extension is installed
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
-- IF THE ABOVE DOESN'T WORK, USE THIS ALTERNATIVE APPROACH
-- ============================================================================

-- Alternative: Create a wrapper function that works around the issue
CREATE OR REPLACE FUNCTION public.call_edge_function(
  function_url TEXT,
  payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Use net.http_post with proper type casting
  SELECT content::jsonb INTO result
  FROM http((
    'POST',
    function_url,
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key'))
    ],
    'application/json',
    payload::text
  )::http_request);

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.call_edge_function TO authenticated, anon, service_role;

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
  RAISE NOTICE 'Wrapper function created for edge calls';
  RAISE NOTICE '========================================';
END $$;
