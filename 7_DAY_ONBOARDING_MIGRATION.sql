-- ============================================
-- 7-Day Onboarding Email System - Database Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create scheduled_emails table
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,  -- 'welcome', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6', 'day_7'
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  retry_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user_id ON scheduled_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_scheduled
  ON scheduled_emails(status, scheduled_for)
  WHERE status = 'pending';

-- 2. Create email_logs table
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  email_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  error_message TEXT,
  metadata JSONB,  -- Store additional data like click URLs, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- 3. Create user_email_preferences table
-- ============================================
CREATE TABLE IF NOT EXISTS user_email_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  onboarding_emails BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT true,
  notification_emails BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT true,
  newsletter BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index
CREATE INDEX IF NOT EXISTS idx_user_email_prefs_user_id ON user_email_preferences(user_id);

-- 4. Function to schedule onboarding emails for new user
-- ============================================
CREATE OR REPLACE FUNCTION schedule_onboarding_emails()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_created_at TIMESTAMPTZ;
BEGIN
  -- Get user's creation time
  user_created_at := NEW.created_at;

  -- Create default email preferences
  INSERT INTO user_email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Schedule Day 1 email: Complete Your Profile (24 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_1', user_created_at + INTERVAL '24 hours');

  -- Schedule Day 2 email: Create Your First Post (48 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_2', user_created_at + INTERVAL '48 hours');

  -- Schedule Day 3 email: Discover & Follow (72 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_3', user_created_at + INTERVAL '72 hours');

  -- Schedule Day 4 email: Try Shopping (96 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_4', user_created_at + INTERVAL '96 hours');

  -- Schedule Day 5 email: Upload Your First Reel (120 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_5', user_created_at + INTERVAL '120 hours');

  -- Schedule Day 6 email: Earn Points Guide (144 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_6', user_created_at + INTERVAL '144 hours');

  -- Schedule Day 7 email: Upgrade to Pro (168 hours after signup)
  INSERT INTO scheduled_emails (user_id, email_type, scheduled_for)
  VALUES (NEW.id, 'day_7', user_created_at + INTERVAL '168 hours');

  RETURN NEW;
END;
$$;

-- 5. Create trigger to schedule emails on user signup
-- ============================================
DROP TRIGGER IF EXISTS trigger_schedule_onboarding_emails ON users;

CREATE TRIGGER trigger_schedule_onboarding_emails
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION schedule_onboarding_emails();

-- 6. Function to get pending emails (for cron job)
-- ============================================
CREATE OR REPLACE FUNCTION get_pending_emails(batch_size INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email_type TEXT,
  email_address TEXT,
  user_name TEXT,
  points_balance INT,
  scheduled_for TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id,
    se.user_id,
    se.email_type,
    u.email,
    COALESCE(u.full_name, u.username),
    COALESCE(u.points_balance, 0),
    se.scheduled_for
  FROM scheduled_emails se
  JOIN users u ON se.user_id = u.id
  JOIN user_email_preferences uep ON u.id = uep.user_id
  WHERE se.status = 'pending'
    AND se.scheduled_for <= now()
    AND uep.onboarding_emails = true  -- Respect user preferences
  ORDER BY se.scheduled_for ASC
  LIMIT batch_size;
END;
$$;

-- 7. Function to mark email as sent
-- ============================================
CREATE OR REPLACE FUNCTION mark_email_sent(
  p_email_id UUID,
  p_status TEXT DEFAULT 'sent',
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE scheduled_emails
  SET
    status = p_status,
    sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
    error_message = p_error_message,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
    updated_at = now()
  WHERE id = p_email_id;
END;
$$;

-- 8. Function to log email activity
-- ============================================
CREATE OR REPLACE FUNCTION log_email_activity(
  p_user_id UUID,
  p_email_type TEXT,
  p_email_address TEXT,
  p_subject TEXT,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO email_logs (
    user_id,
    email_type,
    email_address,
    subject,
    status,
    error_message,
    metadata
  )
  VALUES (
    p_user_id,
    p_email_type,
    p_email_address,
    p_subject,
    p_status,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- 9. Function to cancel scheduled emails (if user completes action early)
-- ============================================
CREATE OR REPLACE FUNCTION cancel_scheduled_email(
  p_user_id UUID,
  p_email_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE scheduled_emails
  SET
    status = 'cancelled',
    updated_at = now()
  WHERE user_id = p_user_id
    AND email_type = p_email_type
    AND status = 'pending';
END;
$$;

-- 10. Function to unsubscribe user from emails
-- ============================================
CREATE OR REPLACE FUNCTION unsubscribe_user_emails(
  p_user_id UUID,
  p_email_type TEXT DEFAULT 'all'  -- 'all', 'onboarding', 'marketing', 'notification'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_email_type = 'all' THEN
    UPDATE user_email_preferences
    SET
      onboarding_emails = false,
      marketing_emails = false,
      notification_emails = false,
      product_updates = false,
      newsletter = false,
      unsubscribed_at = now(),
      updated_at = now()
    WHERE user_id = p_user_id;

    -- Cancel all pending emails
    UPDATE scheduled_emails
    SET status = 'cancelled', updated_at = now()
    WHERE user_id = p_user_id AND status = 'pending';

  ELSIF p_email_type = 'onboarding' THEN
    UPDATE user_email_preferences
    SET onboarding_emails = false, updated_at = now()
    WHERE user_id = p_user_id;

    -- Cancel pending onboarding emails
    UPDATE scheduled_emails
    SET status = 'cancelled', updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'pending'
      AND email_type LIKE 'day_%';

  ELSIF p_email_type = 'marketing' THEN
    UPDATE user_email_preferences
    SET marketing_emails = false, updated_at = now()
    WHERE user_id = p_user_id;

  ELSIF p_email_type = 'notification' THEN
    UPDATE user_email_preferences
    SET notification_emails = false, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- 11. Enable Row Level Security
-- ============================================
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_emails (admin only)
CREATE POLICY "Admin can view all scheduled emails"
  ON scheduled_emails FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- RLS Policies for email_logs (admin only)
CREATE POLICY "Admin can view all email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- RLS Policies for user_email_preferences (users can view/update their own)
CREATE POLICY "Users can view their own email preferences"
  ON user_email_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own email preferences"
  ON user_email_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 12. Create admin view for monitoring
-- ============================================
CREATE OR REPLACE VIEW email_system_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_emails,
  COUNT(*) FILTER (WHERE status = 'sent') as sent_emails,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_emails,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_emails,
  COUNT(DISTINCT user_id) as users_with_scheduled_emails,
  MIN(scheduled_for) FILTER (WHERE status = 'pending') as next_email_at
FROM scheduled_emails;

-- 13. Verification queries
-- ============================================
-- Check that tables were created
SELECT
  'scheduled_emails' as table_name,
  COUNT(*) as row_count
FROM scheduled_emails
UNION ALL
SELECT
  'email_logs' as table_name,
  COUNT(*) as row_count
FROM email_logs
UNION ALL
SELECT
  'user_email_preferences' as table_name,
  COUNT(*) as row_count
FROM user_email_preferences;

-- Check that functions were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'schedule_onboarding_emails',
  'get_pending_emails',
  'mark_email_sent',
  'log_email_activity',
  'cancel_scheduled_email',
  'unsubscribe_user_emails'
)
ORDER BY routine_name;

-- Check trigger was created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_schedule_onboarding_emails';

-- View email system stats
SELECT * FROM email_system_stats;

-- ============================================
-- EXPECTED RESULTS:
-- 1. 3 tables created (scheduled_emails, email_logs, user_email_preferences)
-- 2. 6 functions created
-- 3. 1 trigger created
-- 4. RLS policies enabled
-- 5. Stats view created
-- ============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ 7-Day Onboarding Email System installed successfully!';
  RAISE NOTICE 'ℹ️  New users will automatically be enrolled in the 7-day email sequence.';
  RAISE NOTICE 'ℹ️  Next step: Create Edge Function to process scheduled emails.';
END $$;
