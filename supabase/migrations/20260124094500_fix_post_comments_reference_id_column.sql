-- Fix reference_id column type mismatch in post_comments
-- Error: column "reference_id" is of type uuid but expression is of type text
-- This migration removes the problematic default value or drops the column if unused
-- Date: 2026-01-24

-- Check if reference_id column exists and what its default value is
DO $$
DECLARE
  col_exists boolean;
  col_default text;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_comments'
      AND column_name = 'reference_id'
  ) INTO col_exists;

  IF col_exists THEN
    -- Get the column default
    SELECT column_default INTO col_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_comments'
      AND column_name = 'reference_id';

    RAISE NOTICE 'reference_id column exists with default: %', col_default;

    -- Drop the default value if it exists and is problematic
    IF col_default IS NOT NULL THEN
      ALTER TABLE post_comments ALTER COLUMN reference_id DROP DEFAULT;
      RAISE NOTICE 'Dropped default value from reference_id column';
    END IF;

    -- Make the column nullable if it isn't already
    ALTER TABLE post_comments ALTER COLUMN reference_id DROP NOT NULL;
    RAISE NOTICE 'Made reference_id column nullable';

    -- Option: Drop the column entirely if it's not used
    -- Uncomment the following lines if you want to remove the column completely:
    -- ALTER TABLE post_comments DROP COLUMN IF EXISTS reference_id;
    -- RAISE NOTICE 'Dropped reference_id column from post_comments';
  ELSE
    RAISE NOTICE 'reference_id column does not exist in post_comments table';
  END IF;
END $$;

-- Do the same for reel_comments table
DO $$
DECLARE
  col_exists boolean;
  col_default text;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reel_comments'
      AND column_name = 'reference_id'
  ) INTO col_exists;

  IF col_exists THEN
    -- Get the column default
    SELECT column_default INTO col_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reel_comments'
      AND column_name = 'reference_id';

    RAISE NOTICE 'reference_id column exists in reel_comments with default: %', col_default;

    -- Drop the default value if it exists and is problematic
    IF col_default IS NOT NULL THEN
      ALTER TABLE reel_comments ALTER COLUMN reference_id DROP DEFAULT;
      RAISE NOTICE 'Dropped default value from reel_comments.reference_id column';
    END IF;

    -- Make the column nullable if it isn't already
    ALTER TABLE reel_comments ALTER COLUMN reference_id DROP NOT NULL;
    RAISE NOTICE 'Made reel_comments.reference_id column nullable';
  ELSE
    RAISE NOTICE 'reference_id column does not exist in reel_comments table';
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed reference_id column issues in comments tables';
END $$;
