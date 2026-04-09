-- Fix old notification triggers that reference non-existent "message" column.
-- The correct column is "body" (added in 20260407000001).
-- These old triggers were created before the schema was standardised.

-- Drop any old trigger functions that use the wrong column name
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name TEXT; BEGIN
  SELECT COALESCE(full_name, username, 'Someone') INTO v_actor_name FROM users WHERE id = NEW.follower_id;
  INSERT INTO notifications (user_id, actor_id, type, title, body, reference_type, reference_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'New follower',
          v_actor_name || ' started following you', 'user', NEW.follower_id::TEXT);
  RETURN NEW;
END; $$;

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

-- Also make "body" nullable so any other triggers that omit it don't fail
ALTER TABLE notifications ALTER COLUMN body DROP NOT NULL;

-- Ensure title has a default so it's never null
ALTER TABLE notifications ALTER COLUMN title SET DEFAULT '';
