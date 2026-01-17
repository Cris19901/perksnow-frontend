-- ============================================================================
-- ADD WELCOME EMAIL TRIGGER
-- Sends welcome email when new user signs up
-- ============================================================================

-- First, check if call_edge_function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'call_edge_function'
) as call_edge_function_exists;

-- Create the welcome email function
CREATE OR REPLACE FUNCTION send_welcome_email_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function to send welcome email
  BEGIN
    PERFORM public.call_edge_function(
      'https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/send-email',
      jsonb_build_object(
        'type', 'welcome',
        'email', NEW.email,
        'username', COALESCE(NEW.username, 'User'),
        'referral_code', COALESCE(NEW.referral_code, 'LAVLAY')
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail signup
    RAISE WARNING 'Welcome email failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger (AFTER INSERT so user data is available)
DROP TRIGGER IF EXISTS trigger_send_welcome_email ON users;
CREATE TRIGGER trigger_send_welcome_email
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION send_welcome_email_on_signup();

-- Verify
SELECT 'Triggers on users:' as info;
SELECT trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'users';
