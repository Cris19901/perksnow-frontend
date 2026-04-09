-- The award_points_for_post() trigger function inserts into notifications
-- using the old "message" column (which doesn't exist). Fix it.

CREATE OR REPLACE FUNCTION award_points_for_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id       UUID;
  v_points        INT;
  v_tier          TEXT;
  v_can_earn      BOOLEAN;
  v_daily_posts   INT;
  v_max_posts     INT;
  v_description   TEXT;
BEGIN
  v_user_id := NEW.user_id;

  -- Check if user can earn points
  SELECT
    has_ever_subscribed,
    subscription_tier
  INTO v_can_earn, v_tier
  FROM users WHERE id = v_user_id;

  IF NOT COALESCE(v_can_earn, false) THEN
    RETURN NEW;
  END IF;

  -- Get daily limits
  SELECT max_posts_per_day INTO v_max_posts
  FROM subscription_plan_limits
  WHERE tier = COALESCE(v_tier, 'free')
  LIMIT 1;

  -- Count posts today
  SELECT COUNT(*) INTO v_daily_posts
  FROM posts
  WHERE user_id = v_user_id
    AND created_at >= CURRENT_DATE
    AND id != NEW.id;

  IF v_daily_posts >= COALESCE(v_max_posts, 3) THEN
    RETURN NEW;
  END IF;

  -- Determine points
  v_points := CASE COALESCE(v_tier, 'free')
    WHEN 'pro'     THEN 50
    WHEN 'basic'   THEN 40
    WHEN 'starter' THEN 30
    WHEN 'daily'   THEN 25
    ELSE 10
  END;

  v_description := 'Points for creating a post';

  -- Award points
  INSERT INTO points_transactions (user_id, points, transaction_type, description)
  VALUES (v_user_id, v_points, 'post_creation', v_description)
  ON CONFLICT DO NOTHING;

  -- Update points balance
  UPDATE users SET points_balance = COALESCE(points_balance, 0) + v_points
  WHERE id = v_user_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block post creation due to points error
  RAISE WARNING 'award_points_for_post error: %', SQLERRM;
  RETURN NEW;
END;
$$;
