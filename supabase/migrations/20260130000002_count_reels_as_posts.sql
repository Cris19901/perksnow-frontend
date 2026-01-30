-- Update daily limits functions to count both posts AND reels together

-- Function to get user's daily post and comment usage (including reels)
CREATE OR REPLACE FUNCTION get_user_daily_limits(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
  v_expires_at TIMESTAMP;
  v_plan_limits JSONB;
  v_posts_limit INT;
  v_comments_limit INT;
  v_posts_used INT;
  v_reels_used INT;
  v_total_posts_used INT;
  v_comments_used INT;
  v_result JSON;
BEGIN
  -- Get user's subscription info
  SELECT
    subscription_tier,
    subscription_status,
    subscription_expires_at
  INTO v_tier, v_status, v_expires_at
  FROM users
  WHERE id = p_user_id;

  -- If user not found, return free tier defaults
  IF v_tier IS NULL THEN
    v_tier := 'free';
    v_status := 'inactive';
  END IF;

  -- Check if subscription is expired
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() AND v_tier != 'free' THEN
    v_tier := 'free';
    v_status := 'expired';
  END IF;

  -- Get limits from subscription plan
  SELECT limits
  INTO v_plan_limits
  FROM subscription_plans
  WHERE name = v_tier
  AND is_active = true;

  -- Extract limits (with defaults if not found)
  v_posts_limit := COALESCE((v_plan_limits->>'max_posts_per_day')::INT, 4);
  v_comments_limit := COALESCE((v_plan_limits->>'max_comments_per_day')::INT, 50);

  -- Count today's posts
  SELECT COUNT(*)
  INTO v_posts_used
  FROM posts
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;

  -- Count today's reels
  SELECT COUNT(*)
  INTO v_reels_used
  FROM reels
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;

  -- Total posts = posts + reels
  v_total_posts_used := COALESCE(v_posts_used, 0) + COALESCE(v_reels_used, 0);

  -- Count today's comments
  SELECT COUNT(*)
  INTO v_comments_used
  FROM comments
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;

  -- Build result
  v_result := json_build_object(
    'tier', v_tier,
    'posts_used', v_total_posts_used,
    'posts_limit', v_posts_limit,
    'posts_remaining', GREATEST(v_posts_limit - v_total_posts_used, 0),
    'comments_used', COALESCE(v_comments_used, 0),
    'comments_limit', v_comments_limit,
    'comments_remaining', GREATEST(v_comments_limit - COALESCE(v_comments_used, 0), 0),
    'can_post', (v_total_posts_used < v_posts_limit),
    'can_comment', (COALESCE(v_comments_used, 0) < v_comments_limit)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can post (including reels)
CREATE OR REPLACE FUNCTION can_user_post(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_expires_at TIMESTAMP;
  v_posts_limit INT;
  v_posts_used INT;
  v_reels_used INT;
  v_total_posts_used INT;
BEGIN
  -- Get user's subscription info
  SELECT
    subscription_tier,
    subscription_expires_at
  INTO v_tier, v_expires_at
  FROM users
  WHERE id = p_user_id;

  -- If user not found, use free tier
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Check if subscription is expired
  IF v_expires_at IS NOT NULL AND v_expires_at < NOW() AND v_tier != 'free' THEN
    v_tier := 'free';
  END IF;

  -- Get post limit
  SELECT COALESCE((limits->>'max_posts_per_day')::INT, 4)
  INTO v_posts_limit
  FROM subscription_plans
  WHERE name = v_tier
  AND is_active = true;

  -- Count today's posts
  SELECT COUNT(*)
  INTO v_posts_used
  FROM posts
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;

  -- Count today's reels
  SELECT COUNT(*)
  INTO v_reels_used
  FROM reels
  WHERE user_id = p_user_id
  AND created_at >= CURRENT_DATE;

  -- Total posts = posts + reels
  v_total_posts_used := COALESCE(v_posts_used, 0) + COALESCE(v_reels_used, 0);

  RETURN v_total_posts_used < v_posts_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
