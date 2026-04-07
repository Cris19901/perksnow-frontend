-- Add missing columns to pre-existing notifications table
-- (CREATE TABLE IF NOT EXISTS skipped adding them because the table already existed)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'body'
  ) THEN
    ALTER TABLE notifications ADD COLUMN body TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'reference_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN reference_type TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'reference_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN reference_id TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'title'
  ) THEN
    ALTER TABLE notifications ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN actor_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread   ON notifications (user_id, is_read) WHERE is_read = FALSE;

-- Ensure RLS policies exist (idempotent)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own notifications"       ON notifications;
DROP POLICY IF EXISTS "System can insert notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, UPDATE ON notifications TO authenticated;
GRANT ALL             ON notifications TO service_role;

-- Re-create triggers now that columns exist

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT; BEGIN
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.follower_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'New follower',
          v_actor_name || ' started following you', 'user', NEW.follower_id::TEXT);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

CREATE OR REPLACE FUNCTION notify_on_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT; v_post_author UUID; BEGIN
  SELECT user_id INTO v_post_author FROM posts WHERE id = NEW.post_id;
  IF v_post_author IS NULL OR v_post_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (v_post_author, NEW.user_id, 'like', 'New like',
          v_actor_name || ' liked your post', 'post', NEW.post_id::TEXT);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON post_likes;
CREATE TRIGGER trg_notify_post_like AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_post_like();

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT; v_post_author UUID; BEGIN
  SELECT user_id INTO v_post_author FROM posts WHERE id = NEW.post_id;
  IF v_post_author IS NULL OR v_post_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (v_post_author, NEW.user_id, 'comment', 'New comment',
          v_actor_name || ' commented on your post', 'post', NEW.post_id::TEXT);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_comment ON post_comments;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

CREATE OR REPLACE FUNCTION notify_on_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.points >= 100 THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
    VALUES (NEW.user_id, NULL, 'points', 'Points credited',
            '+' || NEW.points || ' pts — ' || COALESCE(NEW.description, NEW.transaction_type),
            'points_transaction', NEW.id::TEXT);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_points ON points_transactions;
CREATE TRIGGER trg_notify_points AFTER INSERT ON points_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_points();

CREATE OR REPLACE FUNCTION notify_on_withdrawal_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
    VALUES (NEW.user_id, NULL, 'withdrawal', 'Withdrawal successful',
            '₦' || NEW.amount || ' has been sent to your account', 'withdrawal', NEW.id::TEXT);
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
    VALUES (NEW.user_id, NULL, 'withdrawal', 'Withdrawal rejected',
            'Your withdrawal of ₦' || NEW.amount || ' was not processed. ' || COALESCE(NEW.rejection_reason, ''),
            'withdrawal', NEW.id::TEXT);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_withdrawal ON wallet_withdrawals;
CREATE TRIGGER trg_notify_withdrawal AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION notify_on_withdrawal_update();

-- mark_notifications_read RPC
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE notifications SET is_read = TRUE
  WHERE user_id = COALESCE(p_user_id, auth.uid()) AND is_read = FALSE;
END; $$;

GRANT EXECUTE ON FUNCTION mark_notifications_read(UUID) TO authenticated, service_role;
