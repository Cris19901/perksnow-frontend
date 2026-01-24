-- Fix reel_views RLS to allow both authenticated and anonymous users
-- Date: 2026-01-23

-- Drop ALL existing policies on reel_views
DROP POLICY IF EXISTS "Public can track reel views" ON reel_views;
DROP POLICY IF EXISTS "Public can view reel views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can insert reel views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can view reel views" ON reel_views;
DROP POLICY IF EXISTS "Anyone can record reel views" ON reel_views;

-- Create simple permissive policies that work for all users
-- Policy for INSERT - allows anyone (authenticated or anonymous)
CREATE POLICY "Allow all to insert reel views"
  ON reel_views
  FOR INSERT
  WITH CHECK (true);

-- Policy for SELECT - allows anyone to view reel views
CREATE POLICY "Allow all to view reel views"
  ON reel_views
  FOR SELECT
  USING (true);

-- Verify RLS is enabled
ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Reel views RLS policies fixed - all users can now track views';
END $$;
