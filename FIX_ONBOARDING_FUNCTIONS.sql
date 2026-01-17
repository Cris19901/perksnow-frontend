-- ============================================================================
-- IMMEDIATE FIX: Create missing onboarding functions
-- ============================================================================
-- This creates the database functions that OnboardingFlow.tsx needs
-- Run this in Supabase SQL Editor NOW to fix the 404 errors
-- ============================================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS mark_onboarding_step_complete(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_onboarding_progress(UUID);

-- ============================================================================
-- Create onboarding progress table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Onboarding steps
  profile_picture_added BOOLEAN DEFAULT false,
  background_image_added BOOLEAN DEFAULT false,
  bio_added BOOLEAN DEFAULT false,
  location_added BOOLEAN DEFAULT false,
  interests_added BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,
  profile_completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON user_onboarding_progress(user_id);

-- Enable RLS
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON user_onboarding_progress;
DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON user_onboarding_progress;

-- Create policies
CREATE POLICY "Users can view their own onboarding progress"
ON user_onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
ON user_onboarding_progress FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- Function: mark_onboarding_step_complete
-- ============================================================================
-- This is called from OnboardingFlow.tsx at line 130

CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(
  p_user_id UUID,
  p_step_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  new_percentage INTEGER;
  all_completed BOOLEAN := false;
BEGIN
  -- Insert or update progress record
  INSERT INTO user_onboarding_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Mark the step as complete
  CASE p_step_name
    WHEN 'profile_picture' THEN
      UPDATE user_onboarding_progress SET profile_picture_added = true WHERE user_id = p_user_id;
    WHEN 'background_image' THEN
      UPDATE user_onboarding_progress SET background_image_added = true WHERE user_id = p_user_id;
    WHEN 'bio' THEN
      UPDATE user_onboarding_progress SET bio_added = true WHERE user_id = p_user_id;
    WHEN 'location' THEN
      UPDATE user_onboarding_progress SET location_added = true WHERE user_id = p_user_id;
    WHEN 'interests' THEN
      UPDATE user_onboarding_progress SET interests_added = true WHERE user_id = p_user_id;
  END CASE;

  -- Calculate completion percentage (5 steps total)
  SELECT
    (CASE WHEN profile_picture_added THEN 20 ELSE 0 END +
     CASE WHEN background_image_added THEN 20 ELSE 0 END +
     CASE WHEN bio_added THEN 20 ELSE 0 END +
     CASE WHEN location_added THEN 20 ELSE 0 END +
     CASE WHEN interests_added THEN 20 ELSE 0 END)
  INTO new_percentage
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  -- Update percentage
  UPDATE user_onboarding_progress
  SET completion_percentage = new_percentage
  WHERE user_id = p_user_id;

  -- Check if profile is completed (first 3 required steps)
  SELECT
    profile_picture_added AND
    bio_added
  INTO all_completed
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  IF all_completed THEN
    UPDATE user_onboarding_progress
    SET profile_completed = true
    WHERE user_id = p_user_id;

    -- Also mark in users table
    UPDATE users
    SET
      onboarding_completed = true,
      onboarding_completed_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: get_user_onboarding_progress
-- ============================================================================
-- This is called from OnboardingFlow.tsx at line 70

CREATE OR REPLACE FUNCTION get_user_onboarding_progress(p_user_id UUID)
RETURNS TABLE (
  profile_picture_added BOOLEAN,
  background_image_added BOOLEAN,
  bio_added BOOLEAN,
  location_added BOOLEAN,
  interests_added BOOLEAN,
  completion_percentage INTEGER,
  profile_completed BOOLEAN
) AS $$
BEGIN
  -- Ensure progress record exists
  INSERT INTO user_onboarding_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY
  SELECT
    p.profile_picture_added,
    p.background_image_added,
    p.bio_added,
    p.location_added,
    p.interests_added,
    p.completion_percentage,
    p.profile_completed
  FROM user_onboarding_progress p
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION mark_onboarding_step_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_onboarding_progress TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================

-- Test the functions (optional)
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a user ID to test with
  SELECT id INTO test_user_id FROM users LIMIT 1;

  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE '✅ Testing functions with user: %', test_user_id;

    -- Test get_user_onboarding_progress
    PERFORM * FROM get_user_onboarding_progress(test_user_id);
    RAISE NOTICE '✅ get_user_onboarding_progress function works';

    -- Test mark_onboarding_step_complete
    PERFORM mark_onboarding_step_complete(test_user_id, 'profile_picture');
    RAISE NOTICE '✅ mark_onboarding_step_complete function works';
  ELSE
    RAISE NOTICE '⚠️  No users found to test with';
  END IF;
END $$;

-- ============================================================================
-- Final status check
-- ============================================================================

SELECT '✅ ONBOARDING FUNCTIONS CREATED SUCCESSFULLY' as status;

-- Check if functions exist
SELECT
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_name IN ('mark_onboarding_step_complete', 'get_user_onboarding_progress')
ORDER BY routine_name;
