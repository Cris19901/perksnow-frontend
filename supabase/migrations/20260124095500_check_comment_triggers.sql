-- Check for triggers and functions on comments tables
-- Date: 2026-01-24

DO $$
DECLARE
  trig_record RECORD;
  func_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TRIGGERS ON POST_COMMENTS:';
  RAISE NOTICE '========================================';

  FOR trig_record IN
    SELECT
      t.trigger_name,
      t.event_manipulation,
      t.action_timing,
      t.action_statement,
      p.proname as function_name
    FROM information_schema.triggers t
    LEFT JOIN pg_trigger pt ON pt.tgname = t.trigger_name
    LEFT JOIN pg_proc p ON p.oid = pt.tgfoid
    WHERE t.event_object_schema = 'public'
      AND t.event_object_table = 'post_comments'
    ORDER BY t.trigger_name
  LOOP
    RAISE NOTICE 'Trigger: % | Event: % | Timing: % | Function: %',
      trig_record.trigger_name,
      trig_record.event_manipulation,
      trig_record.action_timing,
      COALESCE(trig_record.function_name, 'unknown');
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TRIGGERS ON REEL_COMMENTS:';
  RAISE NOTICE '========================================';

  FOR trig_record IN
    SELECT
      t.trigger_name,
      t.event_manipulation,
      t.action_timing,
      t.action_statement,
      p.proname as function_name
    FROM information_schema.triggers t
    LEFT JOIN pg_trigger pt ON pt.tgname = t.trigger_name
    LEFT JOIN pg_proc p ON p.oid = pt.tgfoid
    WHERE t.event_object_schema = 'public'
      AND t.event_object_table = 'reel_comments'
    ORDER BY t.trigger_name
  LOOP
    RAISE NOTICE 'Trigger: % | Event: % | Timing: % | Function: %',
      trig_record.trigger_name,
      trig_record.event_manipulation,
      trig_record.action_timing,
      COALESCE(trig_record.function_name, 'unknown');
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
