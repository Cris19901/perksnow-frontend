-- ============================================================================
-- ONBOARDING SYSTEM MIGRATION
-- Description: Creates email templates, onboarding tracking, and email scheduling
-- ============================================================================

-- Drop existing objects if they exist (for clean reinstall)
DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at_trigger ON user_onboarding_progress;
DROP FUNCTION IF EXISTS mark_onboarding_step_complete(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_onboarding_progress(UUID);
DROP FUNCTION IF EXISTS schedule_onboarding_emails(UUID);
DROP TABLE IF EXISTS scheduled_emails CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS user_onboarding_progress CASCADE;

-- ============================================================================
-- CREATE USER ONBOARDING PROGRESS TABLE
-- ============================================================================

CREATE TABLE user_onboarding_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Onboarding steps
  profile_picture_added BOOLEAN DEFAULT false,
  background_image_added BOOLEAN DEFAULT false,
  bio_added BOOLEAN DEFAULT false,
  location_added BOOLEAN DEFAULT false,
  interests_added BOOLEAN DEFAULT false,
  first_post_created BOOLEAN DEFAULT false,
  first_follow_completed BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,

  -- Progress tracking
  onboarding_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Timestamps
  onboarding_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE EMAIL TEMPLATES TABLE
-- ============================================================================

CREATE TABLE email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,

  -- Template variables (JSON array of variable names)
  template_variables JSONB DEFAULT '[]'::jsonb,

  -- Email settings
  is_active BOOLEAN DEFAULT true,
  send_delay_hours INTEGER DEFAULT 0 CHECK (send_delay_hours >= 0),

  -- Metadata
  description TEXT,
  category TEXT DEFAULT 'onboarding',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE SCHEDULED EMAILS TABLE
-- ============================================================================

CREATE TABLE scheduled_emails (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Email content (resolved with variables)
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Onboarding Progress Indexes
CREATE INDEX idx_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX idx_onboarding_completed ON user_onboarding_progress(onboarding_completed);

-- Email Templates Indexes
CREATE INDEX idx_email_templates_active ON email_templates(is_active);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- Scheduled Emails Indexes
CREATE INDEX idx_scheduled_emails_user_id ON scheduled_emails(user_id);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_pending ON scheduled_emails(status, scheduled_for) WHERE status = 'pending';

-- ============================================================================
-- ADD ONBOARDING COLUMNS TO USERS TABLE (IF NOT EXISTS)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'background_image_url'
  ) THEN
    ALTER TABLE users ADD COLUMN background_image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE users ADD COLUMN location TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'interests'
  ) THEN
    ALTER TABLE users ADD COLUMN interests TEXT[];
  END IF;
END $$;

-- ============================================================================
-- INSERT EMAIL TEMPLATES
-- ============================================================================

-- Day 1: Welcome Email
INSERT INTO email_templates (template_key, template_name, subject, html_body, text_body, template_variables, send_delay_hours, category, description)
VALUES (
  'onboarding_day1_welcome',
  'Day 1: Welcome Email',
  'Welcome to LavLay, {{user_name}}! 🎉',
  '<h1>Welcome to LavLay!</h1>
<p>Hi {{user_name}},</p>
<p>We''re thrilled to have you join our community! LavLay is where connections happen, ideas flourish, and opportunities grow.</p>
<h2>Get Started in 3 Easy Steps:</h2>
<ol>
  <li><strong>Complete Your Profile</strong> - Add a profile picture and tell us about yourself</li>
  <li><strong>Make Your First Post</strong> - Share what''s on your mind</li>
  <li><strong>Connect with Others</strong> - Follow people who inspire you</li>
</ol>
<p><a href="{{app_url}}/onboarding" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Complete Your Profile</a></p>
<p>Need help? Just reply to this email and we''ll be happy to assist you.</p>
<p>Best regards,<br>The LavLay Team</p>',
  'Welcome to LavLay!

Hi {{user_name}},

We''re thrilled to have you join our community! LavLay is where connections happen, ideas flourish, and opportunities grow.

Get Started in 3 Easy Steps:
1. Complete Your Profile - Add a profile picture and tell us about yourself
2. Make Your First Post - Share what''s on your mind
3. Connect with Others - Follow people who inspire you

Complete your profile: {{app_url}}/onboarding

Need help? Just reply to this email and we''ll be happy to assist you.

Best regards,
The LavLay Team',
  '["user_name", "app_url"]'::jsonb,
  0,
  'onboarding',
  'Welcome email sent immediately after signup'
) ON CONFLICT (template_key) DO NOTHING;

-- Day 2: Profile Completion Reminder
INSERT INTO email_templates (template_key, template_name, subject, html_body, text_body, template_variables, send_delay_hours, category, description)
VALUES (
  'onboarding_day2_profile',
  'Day 2: Profile Completion',
  '{{user_name}}, complete your LavLay profile',
  '<h1>Your Profile is Waiting!</h1>
<p>Hi {{user_name}},</p>
<p>We noticed you haven''t completed your profile yet. A complete profile helps you:</p>
<ul>
  <li>✨ Get discovered by like-minded people</li>
  <li>🤝 Build trust with the community</li>
  <li>🎯 Receive personalized content recommendations</li>
</ul>
<p>It only takes 2 minutes!</p>
<p><a href="{{app_url}}/onboarding" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Complete Your Profile Now</a></p>
<p>See you on LavLay!<br>The LavLay Team</p>',
  'Your Profile is Waiting!

Hi {{user_name}},

We noticed you haven''t completed your profile yet. A complete profile helps you:
- Get discovered by like-minded people
- Build trust with the community
- Receive personalized content recommendations

It only takes 2 minutes!

Complete your profile: {{app_url}}/onboarding

See you on LavLay!
The LavLay Team',
  '["user_name", "app_url"]'::jsonb,
  24,
  'onboarding',
  'Profile completion reminder sent 24 hours after signup'
) ON CONFLICT (template_key) DO NOTHING;

-- Day 3: Engagement Tips
INSERT INTO email_templates (template_key, template_name, subject, html_body, text_body, template_variables, send_delay_hours, category, description)
VALUES (
  'onboarding_day3_engagement',
  'Day 3: Engagement Tips',
  'Tips to get the most out of LavLay 💡',
  '<h1>Maximize Your LavLay Experience</h1>
<p>Hi {{user_name}},</p>
<p>Here are some pro tips to make the most of LavLay:</p>
<h2>🚀 Quick Wins:</h2>
<ol>
  <li><strong>Post Regularly</strong> - Share updates, photos, or products daily</li>
  <li><strong>Engage with Content</strong> - Like and comment on posts to earn points</li>
  <li><strong>Use Hashtags</strong> - Make your content discoverable</li>
  <li><strong>Explore Reels</strong> - Short videos get the most engagement</li>
</ol>
<h2>💰 Earn Points:</h2>
<p>Did you know you can earn points for being active? Points can be converted to real money!</p>
<ul>
  <li>Post content: 10 points</li>
  <li>Get a like: 2 points</li>
  <li>Receive a comment: 5 points</li>
</ul>
<p><a href="{{app_url}}/feed" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Start Exploring</a></p>
<p>Happy posting!<br>The LavLay Team</p>',
  'Maximize Your LavLay Experience

Hi {{user_name}},

Here are some pro tips to make the most of LavLay:

Quick Wins:
1. Post Regularly - Share updates, photos, or products daily
2. Engage with Content - Like and comment on posts to earn points
3. Use Hashtags - Make your content discoverable
4. Explore Reels - Short videos get the most engagement

Earn Points:
Did you know you can earn points for being active? Points can be converted to real money!
- Post content: 10 points
- Get a like: 2 points
- Receive a comment: 5 points

Start exploring: {{app_url}}/feed

Happy posting!
The LavLay Team',
  '["user_name", "app_url"]'::jsonb,
  48,
  'onboarding',
  'Engagement tips sent 48 hours after signup'
) ON CONFLICT (template_key) DO NOTHING;

-- Day 5: Feature Highlights
INSERT INTO email_templates (template_key, template_name, subject, html_body, text_body, template_variables, send_delay_hours, category, description)
VALUES (
  'onboarding_day5_features',
  'Day 5: Feature Highlights',
  'Discover powerful features you might have missed 🎯',
  '<h1>Unlock LavLay''s Full Potential</h1>
<p>Hi {{user_name}},</p>
<p>Here are some amazing features you should try:</p>
<h2>📱 Key Features:</h2>
<ol>
  <li><strong>Marketplace</strong> - Buy and sell products directly on the platform</li>
  <li><strong>Reels</strong> - Create engaging short videos</li>
  <li><strong>Stories</strong> - Share moments that disappear after 24 hours</li>
  <li><strong>Points System</strong> - Earn and withdraw real money</li>
  <li><strong>Membership Tiers</strong> - Unlock exclusive benefits</li>
</ol>
<p><strong>Pro Tip:</strong> Check out the trending section to see what''s popular!</p>
<p><a href="{{app_url}}/explore" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Explore Features</a></p>
<p>Cheers,<br>The LavLay Team</p>',
  'Unlock LavLay''s Full Potential

Hi {{user_name}},

Here are some amazing features you should try:

Key Features:
1. Marketplace - Buy and sell products directly on the platform
2. Reels - Create engaging short videos
3. Stories - Share moments that disappear after 24 hours
4. Points System - Earn and withdraw real money
5. Membership Tiers - Unlock exclusive benefits

Pro Tip: Check out the trending section to see what''s popular!

Explore features: {{app_url}}/explore

Cheers,
The LavLay Team',
  '["user_name", "app_url"]'::jsonb,
  96,
  'onboarding',
  'Feature highlights sent 4 days after signup'
) ON CONFLICT (template_key) DO NOTHING;

-- Day 7: Community Guidelines
INSERT INTO email_templates (template_key, template_name, subject, html_body, text_body, template_variables, send_delay_hours, category, description)
VALUES (
  'onboarding_day7_community',
  'Day 7: Community Guidelines',
  'Help us keep LavLay awesome 🌟',
  '<h1>Our Community Guidelines</h1>
<p>Hi {{user_name}},</p>
<p>LavLay is built on respect, creativity, and authenticity. Here''s how we keep it awesome:</p>
<h2>✅ Do:</h2>
<ul>
  <li>Be respectful and kind</li>
  <li>Share original content</li>
  <li>Support fellow creators</li>
  <li>Report inappropriate content</li>
</ul>
<h2>❌ Don''t:</h2>
<ul>
  <li>Post spam or misleading content</li>
  <li>Harass or bully others</li>
  <li>Share copyrighted material without permission</li>
  <li>Use automation or fake engagement</li>
</ul>
<p>Together, we''re building an amazing community. Thank you for being part of it!</p>
<p><a href="{{app_url}}/guidelines" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Read Full Guidelines</a></p>
<p>Stay awesome,<br>The LavLay Team</p>',
  'Our Community Guidelines

Hi {{user_name}},

LavLay is built on respect, creativity, and authenticity. Here''s how we keep it awesome:

Do:
- Be respectful and kind
- Share original content
- Support fellow creators
- Report inappropriate content

Don''t:
- Post spam or misleading content
- Harass or bully others
- Share copyrighted material without permission
- Use automation or fake engagement

Together, we''re building an amazing community. Thank you for being part of it!

Read full guidelines: {{app_url}}/guidelines

Stay awesome,
The LavLay Team',
  '["user_name", "app_url"]'::jsonb,
  144,
  'onboarding',
  'Community guidelines sent 6 days after signup'
) ON CONFLICT (template_key) DO NOTHING;

-- Profile Completion Email
INSERT INTO email_templates (template_key, template_name, subject, html_body, text_body, template_variables, send_delay_hours, category, description)
VALUES (
  'profile_completed',
  'Profile Completion Celebration',
  '🎉 Your profile is complete, {{user_name}}!',
  '<h1>Congratulations!</h1>
<p>Hi {{user_name}},</p>
<p>You''ve completed your profile! 🎊</p>
<p>Here''s what you can do next:</p>
<ul>
  <li>🔥 Create your first post</li>
  <li>👥 Follow interesting people</li>
  <li>🛍️ List products for sale</li>
  <li>💰 Start earning points</li>
</ul>
<p><a href="{{app_url}}/feed" style="background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Go to Your Feed</a></p>
<p>Welcome to the community!<br>The LavLay Team</p>',
  'Congratulations!

Hi {{user_name}},

You''ve completed your profile! 🎊

Here''s what you can do next:
- Create your first post
- Follow interesting people
- List products for sale
- Start earning points

Go to your feed: {{app_url}}/feed

Welcome to the community!
The LavLay Team',
  '["user_name", "app_url"]'::jsonb,
  0,
  'achievement',
  'Sent immediately when profile is completed'
) ON CONFLICT (template_key) DO NOTHING;

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate onboarding completion percentage
CREATE OR REPLACE FUNCTION calculate_onboarding_percentage(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_steps INTEGER := 7;
  completed_steps INTEGER := 0;
  progress RECORD;
BEGIN
  SELECT * INTO progress
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Count completed steps
  IF progress.profile_picture_added THEN completed_steps := completed_steps + 1; END IF;
  IF progress.background_image_added THEN completed_steps := completed_steps + 1; END IF;
  IF progress.bio_added THEN completed_steps := completed_steps + 1; END IF;
  IF progress.location_added THEN completed_steps := completed_steps + 1; END IF;
  IF progress.interests_added THEN completed_steps := completed_steps + 1; END IF;
  IF progress.first_post_created THEN completed_steps := completed_steps + 1; END IF;
  IF progress.first_follow_completed THEN completed_steps := completed_steps + 1; END IF;

  RETURN (completed_steps * 100) / total_steps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark onboarding step complete
CREATE OR REPLACE FUNCTION mark_onboarding_step_complete(
  p_user_id UUID,
  p_step_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  new_percentage INTEGER;
  all_completed BOOLEAN := false;
BEGIN
  -- Insert or update progress
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
    WHEN 'first_post' THEN
      UPDATE user_onboarding_progress SET first_post_created = true WHERE user_id = p_user_id;
    WHEN 'first_follow' THEN
      UPDATE user_onboarding_progress SET first_follow_completed = true WHERE user_id = p_user_id;
  END CASE;

  -- Calculate new percentage
  new_percentage := calculate_onboarding_percentage(p_user_id);

  -- Update percentage
  UPDATE user_onboarding_progress
  SET completion_percentage = new_percentage
  WHERE user_id = p_user_id;

  -- Check if profile is completed (first 5 steps)
  SELECT
    profile_picture_added AND
    background_image_added AND
    bio_added
  INTO all_completed
  FROM user_onboarding_progress
  WHERE user_id = p_user_id;

  IF all_completed THEN
    UPDATE user_onboarding_progress
    SET profile_completed = true
    WHERE user_id = p_user_id;

    UPDATE users
    SET onboarding_completed = true
    WHERE id = p_user_id;
  END IF;

  -- Check if fully completed
  IF new_percentage >= 100 THEN
    UPDATE user_onboarding_progress
    SET
      onboarding_completed = true,
      onboarding_completed_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user onboarding progress
CREATE OR REPLACE FUNCTION get_user_onboarding_progress(p_user_id UUID)
RETURNS TABLE (
  profile_picture_added BOOLEAN,
  background_image_added BOOLEAN,
  bio_added BOOLEAN,
  location_added BOOLEAN,
  interests_added BOOLEAN,
  first_post_created BOOLEAN,
  first_follow_completed BOOLEAN,
  profile_completed BOOLEAN,
  onboarding_completed BOOLEAN,
  completion_percentage INTEGER
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
    p.first_post_created,
    p.first_follow_completed,
    p.profile_completed,
    p.onboarding_completed,
    p.completion_percentage
  FROM user_onboarding_progress p
  WHERE p.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to schedule onboarding emails for a new user
CREATE OR REPLACE FUNCTION schedule_onboarding_emails(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  template RECORD;
  user_name TEXT;
  app_url TEXT := 'https://lavlay.com'; -- Change to your actual URL
  scheduled_count INTEGER := 0;
BEGIN
  -- Get user's name
  SELECT COALESCE(full_name, username, email) INTO user_name
  FROM users
  WHERE id = p_user_id;

  -- Schedule all active onboarding emails
  FOR template IN
    SELECT * FROM email_templates
    WHERE is_active = true
    AND category = 'onboarding'
    ORDER BY send_delay_hours ASC
  LOOP
    INSERT INTO scheduled_emails (
      user_id,
      template_id,
      scheduled_for,
      subject,
      html_body,
      text_body
    )
    VALUES (
      p_user_id,
      template.id,
      NOW() + (template.send_delay_hours || ' hours')::INTERVAL,
      REPLACE(REPLACE(template.subject, '{{user_name}}', user_name), '{{app_url}}', app_url),
      REPLACE(REPLACE(template.html_body, '{{user_name}}', user_name), '{{app_url}}', app_url),
      REPLACE(REPLACE(template.text_body, '{{user_name}}', user_name), '{{app_url}}', app_url)
    );

    scheduled_count := scheduled_count + 1;
  END LOOP;

  RETURN scheduled_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending emails ready to send
CREATE OR REPLACE FUNCTION get_pending_emails_to_send()
RETURNS TABLE (
  email_id UUID,
  user_id UUID,
  user_email TEXT,
  subject TEXT,
  html_body TEXT,
  text_body TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    se.id as email_id,
    se.user_id,
    u.email as user_email,
    se.subject,
    se.html_body,
    se.text_body
  FROM scheduled_emails se
  JOIN users u ON u.id = se.user_id
  WHERE se.status = 'pending'
  AND se.scheduled_for <= NOW()
  ORDER BY se.scheduled_for ASC
  LIMIT 100; -- Process in batches
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark email as sent
CREATE OR REPLACE FUNCTION mark_email_sent(p_email_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE scheduled_emails
  SET
    status = 'sent',
    sent_at = NOW()
  WHERE id = p_email_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark email as failed
CREATE OR REPLACE FUNCTION mark_email_failed(p_email_id UUID, p_error_message TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE scheduled_emails
  SET
    status = 'failed',
    error_message = p_error_message,
    retry_count = retry_count + 1
  WHERE id = p_email_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_onboarding_progress_updated_at_trigger
BEFORE UPDATE ON user_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at_trigger
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_emails_updated_at_trigger
BEFORE UPDATE ON scheduled_emails
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Onboarding Progress Policies
CREATE POLICY "Users can view their own onboarding progress"
ON user_onboarding_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding progress"
ON user_onboarding_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Email Templates Policies (read-only for all, admins can modify)
CREATE POLICY "Email templates are viewable by everyone"
ON email_templates FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify email templates"
ON email_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Scheduled Emails Policies
CREATE POLICY "Users can view their own scheduled emails"
ON scheduled_emails FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON user_onboarding_progress TO authenticated;
GRANT SELECT ON email_templates TO authenticated;
GRANT SELECT ON scheduled_emails TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_onboarding_percentage TO authenticated;
GRANT EXECUTE ON FUNCTION mark_onboarding_step_complete TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_onboarding_progress TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_onboarding_emails TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_onboarding_progress IS 'Tracks user onboarding steps and completion status';
COMMENT ON TABLE email_templates IS 'Stores email templates for automated emails';
COMMENT ON TABLE scheduled_emails IS 'Queue of scheduled emails to be sent';
COMMENT ON FUNCTION mark_onboarding_step_complete IS 'Mark an onboarding step as complete and update progress';
COMMENT ON FUNCTION schedule_onboarding_emails IS 'Schedule all onboarding emails for a new user';
COMMENT ON FUNCTION get_pending_emails_to_send IS 'Get emails that are ready to be sent';
