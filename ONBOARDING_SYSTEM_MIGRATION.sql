-- ============================================================================
-- USER ONBOARDING SYSTEM MIGRATION
-- ============================================================================
-- This creates tables and functions for tracking new user onboarding progress
-- ============================================================================

-- 1. Create user_onboarding_progress table
CREATE TABLE IF NOT EXISTS user_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step_completed TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step_completed)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON user_onboarding_progress(user_id);

-- 2. Add onboarding fields to users table (if not exist)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 3. Enable RLS for onboarding_progress
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own onboarding progress" ON user_onboarding_progress;
DROP POLICY IF EXISTS "Users can update their own onboarding progress" ON user_onboarding_progress;

-- Users can only view and update their own onboarding progress
CREATE POLICY "Users can view their own onboarding progress"
ON user_onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
ON user_onboarding_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Function to mark onboarding step as complete
-- Drop existing function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS mark_onboarding_step_complete(UUID, TEXT);

CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(
  p_user_id UUID,
  p_step TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the completed step
  INSERT INTO user_onboarding_progress (user_id, step_completed)
  VALUES (p_user_id, p_step)
  ON CONFLICT (user_id, step_completed) DO NOTHING;

  -- Check if all required steps are complete
  -- Required steps: profile_picture, cover_photo, bio (optional: interests)
  IF (
    SELECT COUNT(DISTINCT step_completed)
    FROM user_onboarding_progress
    WHERE user_id = p_user_id
    AND step_completed IN ('profile_picture', 'bio')
  ) >= 2 THEN
    -- Mark onboarding as complete
    UPDATE users
    SET
      onboarding_completed = TRUE,
      onboarding_completed_at = NOW()
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 5. Function to get user onboarding status
CREATE OR REPLACE FUNCTION get_onboarding_status(p_user_id UUID)
RETURNS TABLE(
  step TEXT,
  completed BOOLEAN,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    steps.step_name,
    EXISTS(
      SELECT 1
      FROM user_onboarding_progress
      WHERE user_id = p_user_id
      AND step_completed = steps.step_name
    ) as completed,
    (
      SELECT completed_at
      FROM user_onboarding_progress
      WHERE user_id = p_user_id
      AND step_completed = steps.step_name
      LIMIT 1
    ) as completed_at
  FROM (
    VALUES
      ('profile_picture'),
      ('cover_photo'),
      ('bio'),
      ('interests')
  ) AS steps(step_name);
END;
$$;

-- 6. Trigger to start onboarding when user is created
CREATE OR REPLACE FUNCTION init_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Set onboarding_started_at timestamp
  UPDATE users
  SET onboarding_started_at = NOW()
  WHERE id = NEW.id AND onboarding_started_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_init_user_onboarding ON users;
CREATE TRIGGER trigger_init_user_onboarding
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION init_user_onboarding();

-- ============================================================================
-- Email Templates Table (for scheduled welcome emails)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_id ON scheduled_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);

-- Enable RLS
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own scheduled emails" ON scheduled_emails;
CREATE POLICY "Users can view their own scheduled emails"
ON scheduled_emails FOR SELECT
USING (auth.uid() = user_id);

-- 7. Function to schedule welcome emails for new users
CREATE OR REPLACE FUNCTION schedule_welcome_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Email 1: Welcome email (immediate)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'welcome', NOW());

  -- Email 2: Getting started tips (24 hours later)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'getting_started', NOW() + INTERVAL '24 hours');

  -- Email 3: Community guidelines (48 hours later)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'community_guidelines', NOW() + INTERVAL '48 hours');

  -- Email 4: Feature highlights (72 hours later)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'feature_highlights', NOW() + INTERVAL '72 hours');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schedule_welcome_emails ON users;
CREATE TRIGGER trigger_schedule_welcome_emails
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION schedule_welcome_emails();

-- ============================================================================
-- DONE!
-- ============================================================================
SELECT 'Onboarding system migration completed successfully!' as status;
