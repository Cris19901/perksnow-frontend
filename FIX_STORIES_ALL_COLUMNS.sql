-- ========================================
-- FIX: Add ALL missing columns to stories table
-- ========================================
-- Errors:
-- - column s.thumbnail_url does not exist
-- - column s.duration does not exist
-- This adds all missing columns if they don't exist
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
    RAISE NOTICE '✅ Added thumbnail_url column';
  ELSE
    RAISE NOTICE '✓ thumbnail_url column already exists';
  END IF;
END $$;

-- Add duration column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'duration'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN duration INTEGER DEFAULT 5;
    RAISE NOTICE '✅ Added duration column';
  ELSE
    RAISE NOTICE '✓ duration column already exists';
  END IF;
END $$;

-- Add media_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'media_type'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN media_type VARCHAR(10) CHECK (media_type IN ('image', 'video'));
    RAISE NOTICE '✅ Added media_type column';
  ELSE
    RAISE NOTICE '✓ media_type column already exists';
  END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.stories ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours');
    RAISE NOTICE '✅ Added expires_at column';
  ELSE
    RAISE NOTICE '✓ expires_at column already exists';
  END IF;
END $$;

-- Verify all columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stories'
ORDER BY ordinal_position;

-- Show success message
SELECT '🎉 All required columns have been added to the stories table!' AS status;
