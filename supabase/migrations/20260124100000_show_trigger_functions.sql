-- Show the source code of trigger functions on comments tables
-- Date: 2026-01-24

DO $$
DECLARE
  func_source text;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNCTION: award_points_for_comment_received';
  RAISE NOTICE '========================================';

  SELECT pg_get_functiondef(oid) INTO func_source
  FROM pg_proc
  WHERE proname = 'award_points_for_comment_received'
  LIMIT 1;

  IF func_source IS NOT NULL THEN
    RAISE NOTICE '%', func_source;
  ELSE
    RAISE NOTICE 'Function not found';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNCTION: update_post_comment_count';
  RAISE NOTICE '========================================';

  SELECT pg_get_functiondef(oid) INTO func_source
  FROM pg_proc
  WHERE proname = 'update_post_comment_count'
  LIMIT 1;

  IF func_source IS NOT NULL THEN
    RAISE NOTICE '%', func_source;
  ELSE
    RAISE NOTICE 'Function not found';
  END IF;

  RAISE NOTICE '========================================';
END $$;
