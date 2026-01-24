-- Grant DELETE permissions on activities table to authenticated role
-- Date: 2026-01-24

-- Grant table-level DELETE permission
GRANT DELETE ON activities TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Recreate DELETE policy with explicit role targeting
DROP POLICY IF EXISTS "Users can delete own activities" ON activities;

CREATE POLICY "Authenticated users can delete own activities"
  ON activities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify policies
DO $$
BEGIN
  RAISE NOTICE '✅ Activities DELETE permission granted to authenticated role';
  RAISE NOTICE '✅ RLS policy allows authenticated users to delete their own activities';
END $$;
