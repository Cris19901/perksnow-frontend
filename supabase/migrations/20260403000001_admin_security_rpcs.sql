-- Admin security: audit log table + secure RPCs for all admin actions

-- 1. Admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id           UUID NOT NULL,
  action             TEXT NOT NULL,
  target_user_id     UUID,
  target_resource_id TEXT,
  details            JSONB,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id    ON admin_audit_log (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target_user ON admin_audit_log (target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action      ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at  ON admin_audit_log (created_at DESC);

GRANT INSERT, SELECT ON admin_audit_log TO service_role, authenticated;

-- 2. admin_ban_user — atomically bans/unbans a user and writes audit record
CREATE OR REPLACE FUNCTION admin_ban_user(
  p_admin_id  UUID,
  p_user_id   UUID,
  p_should_ban BOOLEAN,
  p_reason    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  -- Prevent banning another admin
  IF p_should_ban AND EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Cannot ban another admin account';
  END IF;

  -- Apply ban/unban
  UPDATE users SET is_banned = p_should_ban WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Audit record
  INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (
    p_admin_id,
    CASE WHEN p_should_ban THEN 'ban_user' ELSE 'unban_user' END,
    p_user_id,
    jsonb_build_object('reason', p_reason)
  );
END;
$$;

-- 3. admin_upgrade_user — sets subscription tier with correct expiry + audit
CREATE OR REPLACE FUNCTION admin_upgrade_user(
  p_admin_id UUID,
  p_user_id  UUID,
  p_tier     TEXT,
  p_reason   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_prev_tier  TEXT;
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  -- Valid tiers only
  IF p_tier NOT IN ('free', 'daily', 'weekly', 'starter', 'basic', 'pro') THEN
    RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
  END IF;

  -- Get current tier for audit
  SELECT subscription_tier INTO v_prev_tier FROM users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate expiry based on tier
  v_expires_at := CASE p_tier
    WHEN 'daily'   THEN now() + INTERVAL '1 day'
    WHEN 'weekly'  THEN now() + INTERVAL '7 days'
    WHEN 'starter' THEN now() + INTERVAL '15 days'
    WHEN 'basic'   THEN now() + INTERVAL '30 days'
    WHEN 'pro'     THEN now() + INTERVAL '30 days'
    ELSE NULL
  END;

  -- Update subscription
  UPDATE users SET
    subscription_tier       = p_tier,
    subscription_status     = CASE WHEN p_tier = 'free' THEN 'inactive' ELSE 'active' END,
    subscription_expires_at = v_expires_at,
    has_ever_subscribed     = CASE WHEN p_tier != 'free' THEN TRUE ELSE has_ever_subscribed END
  WHERE id = p_user_id;

  -- Audit record
  INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (
    p_admin_id,
    'upgrade_tier',
    p_user_id,
    jsonb_build_object(
      'previous_tier', v_prev_tier,
      'new_tier',      p_tier,
      'expires_at',    v_expires_at,
      'reason',        p_reason
    )
  );

  RETURN jsonb_build_object('expires_at', v_expires_at, 'previous_tier', v_prev_tier);
END;
$$;

-- 4. admin_downgrade_user — resets to free tier + audit
CREATE OR REPLACE FUNCTION admin_downgrade_user(
  p_admin_id UUID,
  p_user_id  UUID,
  p_reason   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_tier TEXT;
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  SELECT subscription_tier INTO v_prev_tier FROM users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  UPDATE users SET
    subscription_tier       = 'free',
    subscription_status     = 'inactive',
    subscription_expires_at = NULL
  WHERE id = p_user_id;

  INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (
    p_admin_id,
    'downgrade_tier',
    p_user_id,
    jsonb_build_object(
      'previous_tier', v_prev_tier,
      'new_tier',      'free',
      'reason',        p_reason
    )
  );
END;
$$;

-- 5. get_admin_audit_logs — paginated log viewer with admin/target usernames joined
-- Drop first to allow changing the return type
DROP FUNCTION IF EXISTS get_admin_audit_logs(INT, INT, TEXT);
CREATE OR REPLACE FUNCTION get_admin_audit_logs(
  p_limit  INT     DEFAULT 25,
  p_offset INT     DEFAULT 0,
  p_action TEXT    DEFAULT NULL
)
RETURNS TABLE (
  id                 UUID,
  admin_id           UUID,
  admin_username     TEXT,
  action             TEXT,
  target_user_id     UUID,
  target_username    TEXT,
  target_resource_id TEXT,
  details            JSONB,
  created_at         TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can view audit logs';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.admin_id,
    COALESCE(a.username, l.admin_id::TEXT)    AS admin_username,
    l.action,
    l.target_user_id,
    t.username                                 AS target_username,
    l.target_resource_id,
    l.details,
    l.created_at
  FROM admin_audit_log l
  LEFT JOIN users a ON a.id = l.admin_id
  LEFT JOIN users t ON t.id = l.target_user_id
  WHERE (p_action IS NULL OR l.action = p_action)
  ORDER BY l.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_ban_user(UUID, UUID, BOOLEAN, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION admin_upgrade_user(UUID, UUID, TEXT, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION admin_downgrade_user(UUID, UUID, TEXT)      TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_audit_logs(INT, INT, TEXT)        TO authenticated;
