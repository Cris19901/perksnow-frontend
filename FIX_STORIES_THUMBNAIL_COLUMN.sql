-- ========================================
-- FIX: Add missing thumbnail_url column to stories table
-- ========================================
-- Error: column s.thumbnail_url does not exist
-- This adds the missing column if it doesn't exist
-- ========================================

-- Add thumbnail_url column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN thumbnail_url TEXT;
    RAISE NOTICE 'Added thumbnail_url column to stories table';
  ELSE
    RAISE NOTICE 'thumbnail_url column already exists';
  END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stories'
ORDER BY ordinal_position;
