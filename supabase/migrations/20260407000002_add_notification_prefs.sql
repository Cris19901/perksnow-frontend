-- Add notification_prefs JSONB column to users table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_prefs JSONB DEFAULT '{
      "new_messages": true,
      "likes_comments": true,
      "new_followers": true,
      "points_earned": true,
      "withdrawal_updates": true
    }'::jsonb;
  END IF;
END $$;
