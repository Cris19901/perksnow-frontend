-- Add DELETE permissions for activities table
-- Date: 2026-01-24

-- Ensure the DELETE policy exists and is correct
DROP POLICY IF EXISTS "Users can delete own activities" ON activities;

CREATE POLICY "Users can delete own activities"
  ON activities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Activities DELETE permissions fixed - users can now delete their own activities';
END $$;
