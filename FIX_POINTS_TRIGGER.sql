-- ========================================
-- FIX FOR POINTS SYSTEM TRIGGER
-- ========================================
-- Problem: The award_points() function inserts into transaction_type, source, description
--          but the points_transactions table requires the 'activity' column (NOT NULL)
--
-- Solution: Update award_points() function to also populate the 'activity' column
-- ========================================

-- Fix the award_points function to include the activity column
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_points integer,
  p_source text,
  p_description text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert transaction with BOTH activity and source (they're the same value)
  INSERT INTO points_transactions (
    user_id,
    points,
    activity,           -- ✅ NOW INCLUDED!
    transaction_type,
    source,
    description,
    metadata
  )
  VALUES (
    p_user_id,
    p_points,
    p_source,          -- ✅ Use p_source for activity (e.g., 'post_created')
    'earned',          -- transaction_type
    p_source,          -- source
    p_description,     -- description
    p_metadata         -- metadata
  );

  -- Update user's points balance
  UPDATE users
  SET points_balance = points_balance + p_points
  WHERE id = p_user_id;
END;
$function$;

-- ========================================
-- Now re-enable the trigger
-- ========================================

-- Re-enable all triggers on posts table
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'posts'
  LOOP
    EXECUTE format('ALTER TABLE posts ENABLE TRIGGER %I', trigger_record.trigger_name);
    RAISE NOTICE 'Enabled trigger: %', trigger_record.trigger_name;
  END LOOP;
END $$;

-- ========================================
-- Verify the fix
-- ========================================

-- Check that the function was updated
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'award_points'
  AND pg_get_function_identity_arguments(p.oid) LIKE '%p_source%';

-- Check that triggers are enabled
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'posts'
  AND trigger_name LIKE '%point%';
