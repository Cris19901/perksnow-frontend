-- Grant explicit SELECT permissions on activities table to anon and authenticated roles
-- Date: 2026-01-24

-- Grant table-level SELECT permission to both roles
GRANT SELECT ON activities TO anon, authenticated;

-- Ensure RLS is enabled
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Anyone can view public activities" ON activities;
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
DROP POLICY IF EXISTS "Users can view public activities" ON activities;

-- Create new comprehensive SELECT policies
-- Policy 1: Everyone (including anon) can read public activities
CREATE POLICY "Public activities are viewable by everyone"
  ON activities
  FOR SELECT
  TO public
  USING (is_public = true);

-- Policy 2: Authenticated users can also read their own private activities  
CREATE POLICY "Authenticated users can read own activities"
  ON activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify policies were created
DO $$
BEGIN
  RAISE NOTICE '✅ Activities SELECT permissions granted to anon and authenticated roles';
  RAISE NOTICE '✅ RLS policies created for public and private activity viewing';
END $$;
