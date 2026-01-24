-- Fix activities table read permissions for all users (including anonymous)
-- Date: 2026-01-24

-- Drop the existing restrictive read policies
DROP POLICY IF EXISTS "Users can view public activities" ON activities;
DROP POLICY IF EXISTS "Users can view own activities" ON activities;

-- Create a single permissive read policy for everyone (including anon users)
CREATE POLICY "Anyone can view public activities"
  ON activities
  FOR SELECT
  USING (is_public = true);

-- Authenticated users can also view their own private activities
CREATE POLICY "Users can view own activities"
  ON activities
  FOR SELECT
  USING (auth.uid() = user_id);

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Activities read permissions fixed - anonymous users can now view public activities';
END $$;
