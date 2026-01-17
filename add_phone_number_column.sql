-- Add phone_number column to users table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Check if phone_number column exists and add it if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE users
    ADD COLUMN phone_number TEXT;

    RAISE NOTICE 'phone_number column added successfully';
  ELSE
    RAISE NOTICE 'phone_number column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('phone_number', 'username', 'email', 'full_name')
ORDER BY column_name;
