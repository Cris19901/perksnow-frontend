-- Diagnose post_comments table structure
-- Show all columns, their types, and defaults
-- Date: 2026-01-24

DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'POST_COMMENTS TABLE STRUCTURE:';
  RAISE NOTICE '========================================';

  FOR col_record IN
    SELECT
      column_name,
      data_type,
      udt_name,
      column_default,
      is_nullable,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_comments'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: % | Type: % (%) | Default: % | Nullable: %',
      col_record.column_name,
      col_record.data_type,
      col_record.udt_name,
      COALESCE(col_record.column_default, 'NULL'),
      col_record.is_nullable;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'REEL_COMMENTS TABLE STRUCTURE:';
  RAISE NOTICE '========================================';

  FOR col_record IN
    SELECT
      column_name,
      data_type,
      udt_name,
      column_default,
      is_nullable,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reel_comments'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: % | Type: % (%) | Default: % | Nullable: %',
      col_record.column_name,
      col_record.data_type,
      col_record.udt_name,
      COALESCE(col_record.column_default, 'NULL'),
      col_record.is_nullable;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;
