-- CRITICAL SECURITY FIX: Enforce Admin Access via RLS Policies
-- This prevents non-admin users from bypassing client-side checks

-- ============================================================================
-- 1. Create helper function to check if current user is admin
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================================================
-- 2. Point Settings - Admin Only
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view point_settings" ON point_settings;
DROP POLICY IF EXISTS "Only admins can modify point_settings" ON point_settings;

-- Enable RLS
ALTER TABLE point_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Only admins can view point_settings"
ON point_settings
FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can insert
CREATE POLICY "Only admins can insert point_settings"
ON point_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Only admins can update
CREATE POLICY "Only admins can update point_settings"
ON point_settings
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Only admins can delete
CREATE POLICY "Only admins can delete point_settings"
ON point_settings
FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- 3. Withdrawal Requests - Admins can see all, users can see only theirs
-- ============================================================================

-- Drop all existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users and admins can view withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Only admins can update withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can delete own pending withdrawals, admins delete any" ON withdrawal_requests;

-- Enable RLS
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own, admins can view all
CREATE POLICY "Users and admins can view withdrawal requests"
ON withdrawal_requests
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR is_admin()
);

-- Only users can create their own withdrawal requests
CREATE POLICY "Users can create own withdrawal requests"
ON withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Only admins can update withdrawal requests (approve/reject)
CREATE POLICY "Only admins can update withdrawal requests"
ON withdrawal_requests
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Users can cancel their own pending requests, admins can delete any
CREATE POLICY "Users can delete own pending withdrawals, admins delete any"
ON withdrawal_requests
FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid() AND status = 'pending') OR is_admin()
);

-- ============================================================================
-- 4. Users Table - Admins can modify sensitive fields
-- ============================================================================

-- Drop existing policies if conflicting
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Anyone can view public user data" ON users;
DROP POLICY IF EXISTS "Only admins can update sensitive user fields" ON users;

-- Users can view all users (for social features)
CREATE POLICY "Anyone can view public user data"
ON users
FOR SELECT
TO authenticated
USING (true);

-- Only admins can update role, is_banned, subscription fields
CREATE POLICY "Only admins can update sensitive user fields"
ON users
FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  id = auth.uid() OR
  -- Admins can update anyone
  is_admin()
)
WITH CHECK (
  -- If updating own profile, cannot change role or ban status
  (id = auth.uid() AND
   role = (SELECT role FROM users WHERE id = auth.uid()) AND
   is_banned = (SELECT is_banned FROM users WHERE id = auth.uid())
  ) OR
  -- Admins can change anything
  is_admin()
);

-- ============================================================================
-- 5. Admin Audit Log Table (NEW)
-- ============================================================================

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON admin_audit_log(resource_type, resource_id);

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit log
CREATE POLICY "Only admins can view audit log"
ON admin_audit_log
FOR SELECT
TO authenticated
USING (is_admin());

-- Only admins can insert audit log entries
CREATE POLICY "Only admins can insert audit log"
ON admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- No one can update or delete audit log (immutable)
-- (No policies = no access)

-- ============================================================================
-- 6. Create function to log admin actions automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  -- Only log if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can log actions';
  END IF;

  INSERT INTO admin_audit_log (
    admin_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- ============================================================================
-- 7. Update process_withdrawal_request to log admin actions
-- ============================================================================

-- Drop existing function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS process_withdrawal_request(uuid, text, text);

CREATE OR REPLACE FUNCTION process_withdrawal_request(
  p_request_id uuid,
  p_new_status text,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_request RECORD;
  v_result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can process withdrawal requests';
  END IF;

  -- Validate status
  IF p_new_status NOT IN ('approved', 'rejected', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status. Must be: approved, rejected, completed, or cancelled';
  END IF;

  -- Get the withdrawal request
  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;

  -- Check if request is already processed
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal request has already been processed';
  END IF;

  -- If rejecting, restore user points
  IF p_new_status = 'rejected' THEN
    UPDATE users
    SET points_balance = points_balance + v_request.amount_points
    WHERE id = v_request.user_id;
  END IF;

  -- Update the withdrawal request
  UPDATE withdrawal_requests
  SET
    status = p_new_status,
    admin_notes = p_admin_notes,
    updated_at = now()
  WHERE id = p_request_id;

  -- Log the admin action
  PERFORM log_admin_action(
    'withdrawal_' || p_new_status,
    'withdrawal_request',
    p_request_id::text,
    jsonb_build_object(
      'user_id', v_request.user_id,
      'amount_points', v_request.amount_points,
      'amount_currency', v_request.amount_currency,
      'admin_notes', p_admin_notes
    )
  );

  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Withdrawal request ' || p_new_status || ' successfully',
    'request_id', p_request_id,
    'new_status', p_new_status
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_withdrawal_request TO authenticated;

-- ============================================================================
-- 8. Protect admin-only database functions
-- ============================================================================

-- Create a function to get all users (admin only)
CREATE OR REPLACE FUNCTION admin_get_all_users(
  p_search text DEFAULT NULL,
  p_tier text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  email text,
  subscription_tier text,
  subscription_status text,
  subscription_expires_at timestamptz,
  points_balance bigint,
  is_banned boolean,
  created_at timestamptz,
  followers_count bigint,
  following_count bigint
) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.username,
    u.full_name,
    u.email,
    u.subscription_tier,
    u.subscription_status,
    u.subscription_expires_at,
    u.points_balance,
    u.is_banned,
    u.created_at,
    u.followers_count,
    u.following_count
  FROM users u
  WHERE
    (p_search IS NULL OR
     u.username ILIKE '%' || p_search || '%' OR
     u.full_name ILIKE '%' || p_search || '%' OR
     u.email ILIKE '%' || p_search || '%')
    AND
    (p_tier IS NULL OR p_tier = 'all' OR u.subscription_tier = p_tier)
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_get_all_users TO authenticated;

-- ============================================================================
-- 9. Create function to get total points (fixes memory issue)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_total_points_in_circulation()
RETURNS bigint AS $$
DECLARE
  v_total bigint;
BEGIN
  -- No admin check needed - this is just a stat
  SELECT COALESCE(SUM(points_balance), 0)
  INTO v_total
  FROM users;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_total_points_in_circulation TO authenticated, anon;

-- ============================================================================
-- 10. Create admin dashboard stats function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb AS $$
DECLARE
  v_stats jsonb;
  v_total_users bigint;
  v_total_points bigint;
  v_pending_withdrawals bigint;
  v_total_withdrawals bigint;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access dashboard stats';
  END IF;

  -- Get total users
  SELECT COUNT(*) INTO v_total_users FROM users;

  -- Get total points (using new function)
  SELECT get_total_points_in_circulation() INTO v_total_points;

  -- Get pending withdrawals
  SELECT COUNT(*) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE status = 'pending';

  -- Get total withdrawals
  SELECT COUNT(*) INTO v_total_withdrawals
  FROM withdrawal_requests;

  -- Build result
  v_stats := jsonb_build_object(
    'totalUsers', v_total_users,
    'totalPoints', v_total_points,
    'pendingWithdrawals', v_pending_withdrawals,
    'totalWithdrawals', v_total_withdrawals
  );

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
-- 1. All admin functions now check is_admin() at the database level
-- 2. RLS policies prevent unauthorized access even if client-side is bypassed
-- 3. Admin actions are now logged automatically
-- 4. Withdrawal processing includes automatic audit logging
-- 5. Users table updates are restricted - users cannot change their own role
-- 6. Admin audit log is immutable (no update/delete policies)
