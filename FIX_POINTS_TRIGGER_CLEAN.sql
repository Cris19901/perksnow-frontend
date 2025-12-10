-- ========================================
-- FIX FOR POINTS SYSTEM TRIGGER (CLEAN VERSION)
-- ========================================
-- This fixes the award_points() function to include the activity column
-- ========================================

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
  -- Insert transaction with activity column included
  INSERT INTO points_transactions (
    user_id,
    points,
    activity,
    transaction_type,
    source,
    description,
    metadata
  )
  VALUES (
    p_user_id,
    p_points,
    p_source,
    'earned',
    p_source,
    p_description,
    p_metadata
  );

  -- Update user's points balance
  UPDATE users
  SET points_balance = points_balance + p_points
  WHERE id = p_user_id;
END;
$function$;

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
