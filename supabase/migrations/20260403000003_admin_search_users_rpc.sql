-- admin_search_users: safe server-side user search RPC for admin pages
-- Prevents any PostgREST filter injection by accepting plain text and using
-- parameterized ILIKE inside the function body.

CREATE OR REPLACE FUNCTION admin_search_users(
  p_search      TEXT    DEFAULT NULL,
  p_tier        TEXT    DEFAULT NULL,  -- 'all' | specific tier | 'paid'
  p_banned      TEXT    DEFAULT 'all', -- 'all' | 'banned' | 'active'
  p_sort_by     TEXT    DEFAULT 'created_at',
  p_sort_asc    BOOLEAN DEFAULT FALSE,
  p_page        INT     DEFAULT 1,
  p_per_page    INT     DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sql       TEXT;
  v_count_sql TEXT;
  v_where     TEXT := ' WHERE TRUE';
  v_order     TEXT;
  v_offset    INT;
  v_result    JSONB;
  v_count     BIGINT;
  v_rows      JSONB;
  v_safe_sort TEXT;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can search users';
  END IF;

  -- Sanitize sort column to a whitelist (prevent column injection)
  v_safe_sort := CASE p_sort_by
    WHEN 'username'              THEN 'username'
    WHEN 'email'                 THEN 'email'
    WHEN 'subscription_tier'     THEN 'subscription_tier'
    WHEN 'points_balance'        THEN 'points_balance'
    WHEN 'subscription_expires_at' THEN 'subscription_expires_at'
    ELSE 'created_at'
  END;

  -- Search filter (parameterized via ILIKE with $1 placeholder style not available in
  -- dynamic SQL easily, so we use quote_literal which escapes single quotes)
  IF p_search IS NOT NULL AND p_search != '' THEN
    -- Escape the search term for ILIKE (quote_literal adds surrounding quotes)
    -- We build the pattern string safely
    v_where := v_where || ' AND (
      username ILIKE ' || quote_literal('%' || p_search || '%') || '
      OR full_name ILIKE ' || quote_literal('%' || p_search || '%') || '
      OR email ILIKE ' || quote_literal('%' || p_search || '%') || '
    )';
  END IF;

  -- Tier filter
  IF p_tier IS NOT NULL AND p_tier != 'all' THEN
    IF p_tier = 'paid' THEN
      v_where := v_where || ' AND subscription_tier != ''free''';
    ELSE
      v_where := v_where || ' AND subscription_tier = ' || quote_literal(p_tier);
    END IF;
  END IF;

  -- Banned filter
  IF p_banned = 'banned' THEN
    v_where := v_where || ' AND is_banned = TRUE';
  ELSIF p_banned = 'active' THEN
    v_where := v_where || ' AND is_banned = FALSE';
  END IF;

  v_offset := (p_page - 1) * p_per_page;
  v_order := ' ORDER BY ' || v_safe_sort || CASE WHEN p_sort_asc THEN ' ASC' ELSE ' DESC' END;

  -- Count query
  v_count_sql := 'SELECT COUNT(*) FROM users' || v_where;
  EXECUTE v_count_sql INTO v_count;

  -- Data query
  v_sql := '
    SELECT jsonb_agg(row_to_json(u))
    FROM (
      SELECT
        id, username, full_name, email, avatar_url,
        subscription_tier, subscription_status, subscription_expires_at,
        points_balance, is_banned, created_at,
        followers_count, following_count, phone, role
      FROM users' || v_where || v_order ||
      ' LIMIT ' || p_per_page || ' OFFSET ' || v_offset || '
    ) u';

  EXECUTE v_sql INTO v_rows;

  RETURN jsonb_build_object(
    'users', COALESCE(v_rows, '[]'::jsonb),
    'total', v_count,
    'page',  p_page,
    'per_page', p_per_page
  );
END;
$$;

GRANT EXECUTE ON FUNCTION admin_search_users(TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT) TO authenticated;
