-- Fix reel_views table permissions
-- Users are getting 403 errors when tracking reel views
-- Date: 2026-01-24

-- Grant INSERT permission on reel_views to authenticated users
GRANT INSERT ON reel_views TO authenticated;

-- Create policy to allow authenticated users to insert their own views
DROP POLICY IF EXISTS "Users can insert own reel views" ON reel_views;
CREATE POLICY "Users can insert own reel views"
  ON reel_views
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view all reel views (for analytics)
GRANT SELECT ON reel_views TO authenticated;
DROP POLICY IF EXISTS "Anyone can view reel views" ON reel_views;
CREATE POLICY "Anyone can view reel views"
  ON reel_views
  FOR SELECT
  TO authenticated
  USING (true);

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Reel views permissions fixed - users can now track video views';
END $$;
