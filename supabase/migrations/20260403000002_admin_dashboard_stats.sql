-- Admin dashboard stats RPC: returns a single JSON object with all key metrics
-- Used by AdminDashboard.tsx to avoid multiple round-trips on page load

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users          BIGINT;
  v_new_users_today      BIGINT;
  v_new_users_this_week  BIGINT;
  v_active_subscriptions BIGINT;
  v_pending_withdrawals  BIGINT;
  v_total_withdrawals    BIGINT;
  v_total_withdrawn_ngn  NUMERIC;
  v_total_posts          BIGINT;
  v_total_reels          BIGINT;
  v_banned_users         BIGINT;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can access dashboard stats';
  END IF;

  SELECT COUNT(*) INTO v_total_users FROM users;

  SELECT COUNT(*) INTO v_new_users_today
  FROM users WHERE created_at >= CURRENT_DATE;

  SELECT COUNT(*) INTO v_new_users_this_week
  FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';

  SELECT COUNT(*) INTO v_active_subscriptions
  FROM users
  WHERE subscription_status = 'active'
    AND subscription_tier != 'free'
    AND (subscription_expires_at IS NULL OR subscription_expires_at > now());

  SELECT COUNT(*) INTO v_pending_withdrawals
  FROM wallet_withdrawals WHERE status = 'pending';

  SELECT COUNT(*) INTO v_total_withdrawals
  FROM wallet_withdrawals WHERE status IN ('completed', 'processing');

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawn_ngn
  FROM wallet_withdrawals WHERE status = 'completed';

  SELECT COUNT(*) INTO v_total_posts FROM posts;

  SELECT COUNT(*) INTO v_total_reels FROM reels;

  SELECT COUNT(*) INTO v_banned_users FROM users WHERE is_banned = TRUE;

  RETURN jsonb_build_object(
    'totalUsers',          v_total_users,
    'newUsersToday',       v_new_users_today,
    'newUsersThisWeek',    v_new_users_this_week,
    'activeSubscriptions', v_active_subscriptions,
    'pendingWithdrawals',  v_pending_withdrawals,
    'totalWithdrawals',    v_total_withdrawals,
    'totalWithdrawnNgn',   v_total_withdrawn_ngn,
    'totalPosts',          v_total_posts,
    'totalReels',          v_total_reels,
    'bannedUsers',         v_banned_users
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats() TO authenticated;
