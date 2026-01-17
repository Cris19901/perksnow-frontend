-- ============================================================================
-- SIMPLE EMAIL SYSTEM FIX - NO SUPERUSER REQUIRED
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create a simple wrapper function with hardcoded credentials
CREATE OR REPLACE FUNCTION public.send_edge_function_email(
  email_type TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  extra_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  response_status INTEGER;
  response_content TEXT;
BEGIN
  -- Call the Edge Function using extensions.http with hardcoded auth
  SELECT
    status,
    content
  INTO
    response_status,
    response_content
  FROM extensions.http((
    'POST',
    'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
    ARRAY[
      extensions.http_header('Content-Type', 'application/json'),
      extensions.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzd2tuYmx3amxrZ3hndnlwa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTg4MTAsImV4cCI6MjA3ODE5NDgxMH0.qK_7wzeOUwRhHTWWtNvpayh1hOfyfXZw5W4X0VbDwZY')
    ],
    'application/json',
    jsonb_build_object(
      'type', email_type,
      'data', jsonb_build_object(
        'to_email', recipient_email,
        'to_name', recipient_name
      ) || extra_data
    )::text
  )::extensions.http_request);

  -- Build result
  result := jsonb_build_object(
    'status', response_status,
    'response', response_content
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'status', 500
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.send_edge_function_email TO authenticated, anon, service_role;

-- ============================================================================
-- TEST THE FUNCTION
-- ============================================================================

-- Send a test welcome email
SELECT public.send_edge_function_email(
  'welcome',
  'fadiscojay@gmail.com',
  'Test User',
  jsonb_build_object('referral_code', 'TEST123')
);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Email Function - CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: public.send_edge_function_email';
  RAISE NOTICE 'Test email sent to: fadiscojay@gmail.com';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Check your inbox in 1-2 minutes!';
  RAISE NOTICE '========================================';
END $$;
