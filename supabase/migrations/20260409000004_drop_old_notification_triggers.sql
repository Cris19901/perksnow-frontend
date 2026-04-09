-- Drop ALL old notification-related triggers on posts table (any that use "message" column)
-- Then recreate the correct ones using "body" column.

-- Drop every trigger on posts that could fire a notification
DROP TRIGGER IF EXISTS on_post_created ON posts;
DROP TRIGGER IF EXISTS trg_notify_post ON posts;
DROP TRIGGER IF EXISTS notify_followers_on_post ON posts;
DROP TRIGGER IF EXISTS on_new_post ON posts;
DROP TRIGGER IF EXISTS post_notification ON posts;

-- Drop triggers on post_likes
DROP TRIGGER IF EXISTS trg_notify_post_like ON post_likes;
DROP TRIGGER IF EXISTS on_post_liked ON post_likes;
DROP TRIGGER IF EXISTS notify_on_like ON post_likes;

-- Drop triggers on post_comments
DROP TRIGGER IF EXISTS trg_notify_comment ON post_comments;
DROP TRIGGER IF EXISTS on_post_commented ON post_comments;
DROP TRIGGER IF EXISTS notify_on_comment ON post_comments;

-- Drop triggers on follows
DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
DROP TRIGGER IF EXISTS on_new_follow ON follows;

-- Drop triggers on points_transactions
DROP TRIGGER IF EXISTS trg_notify_points ON points_transactions;

-- Drop triggers on wallet_withdrawals
DROP TRIGGER IF EXISTS trg_notify_withdrawal ON wallet_withdrawals;

-- Drop any old trigger functions that might still reference "message"
DROP FUNCTION IF EXISTS notify_followers_on_new_post() CASCADE;
DROP FUNCTION IF EXISTS notify_on_new_post() CASCADE;
DROP FUNCTION IF EXISTS create_post_notification() CASCADE;

-- Recreate all trigger functions correctly with "body" column
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT;
BEGIN
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.follower_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'New follower',
          v_actor_name || ' started following you', 'user', NEW.follower_id::TEXT)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; -- never block the main operation
END; $$;

CREATE OR REPLACE FUNCTION notify_on_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT; v_post_author UUID;
BEGIN
  SELECT user_id INTO v_post_author FROM posts WHERE id = NEW.post_id;
  IF v_post_author IS NULL OR v_post_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (v_post_author, NEW.user_id, 'like', 'New like',
          v_actor_name || ' liked your post', 'post', NEW.post_id::TEXT)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT; v_post_author UUID;
BEGIN
  SELECT user_id INTO v_post_author FROM posts WHERE id = NEW.post_id;
  IF v_post_author IS NULL OR v_post_author = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.user_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (v_post_author, NEW.user_id, 'comment', 'New comment',
          v_actor_name || ' commented on your post', 'post', NEW.post_id::TEXT)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION notify_on_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.points >= 100 THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
    VALUES (NEW.user_id, NULL, 'points', 'Points credited',
            '+' || NEW.points || ' pts — ' || COALESCE(NEW.description, NEW.transaction_type),
            'points_transaction', NEW.id::TEXT)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION notify_on_withdrawal_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
    VALUES (NEW.user_id, NULL, 'withdrawal', 'Withdrawal successful',
            '₦' || NEW.amount || ' has been sent to your account', 'withdrawal', NEW.id::TEXT)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
    VALUES (NEW.user_id, NULL, 'withdrawal', 'Withdrawal rejected',
            'Your withdrawal of ₦' || NEW.amount || ' was not processed. ' || COALESCE(NEW.rejection_reason, ''),
            'withdrawal', NEW.id::TEXT)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END; $$;

-- Recreate all triggers
CREATE TRIGGER trg_notify_follow AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

CREATE TRIGGER trg_notify_post_like AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_post_like();

CREATE TRIGGER trg_notify_comment AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

CREATE TRIGGER trg_notify_points AFTER INSERT ON points_transactions
  FOR EACH ROW EXECUTE FUNCTION notify_on_points();

CREATE TRIGGER trg_notify_withdrawal AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW EXECUTE FUNCTION notify_on_withdrawal_update();
