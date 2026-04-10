-- Fix: drop existing get_max_withdrawal_amount (wrong return type) and recreate.
-- The column + backfill from 20260410000001 already applied successfully.

-- ─────────────────────────────────────────────────────────────
-- 1. RPC: get_max_withdrawal_amount(p_user_id)
--    Returns the max POINTS the user may withdraw next.
--    Returns NULL for unlimited (6th withdrawal onward),
--    which causes the frontend to keep its 999999999 default.
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_max_withdrawal_amount(UUID);

CREATE OR REPLACE FUNCTION get_max_withdrawal_amount(p_user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COALESCE(successful_withdrawals_count, 0)
  INTO v_count
  FROM users
  WHERE id = p_user_id;

  -- If user not found, apply most restrictive limit
  IF NOT FOUND THEN
    RETURN 5000;
  END IF;

  RETURN CASE v_count
    WHEN 0 THEN   5000   -- 1st withdrawal: ₦500
    WHEN 1 THEN  15000   -- 2nd withdrawal: ₦1,500
    WHEN 2 THEN  30000   -- 3rd withdrawal: ₦3,000
    WHEN 3 THEN  50000   -- 4th withdrawal: ₦5,000
    WHEN 4 THEN 100000   -- 5th withdrawal: ₦10,000
    ELSE NULL            -- 6th+: unlimited
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_max_withdrawal_amount(UUID) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. Trigger function: increment count when status → 'completed'
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_successful_withdrawals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when status transitions INTO 'completed' from something else
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE users
    SET successful_withdrawals_count = COALESCE(successful_withdrawals_count, 0) + 1
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'increment_successful_withdrawals error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_successful_withdrawals ON wallet_withdrawals;

CREATE TRIGGER trg_increment_successful_withdrawals
  AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION increment_successful_withdrawals();

-- ─────────────────────────────────────────────────────────────
-- 3. Confirmation
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Progressive withdrawal limits live';
  RAISE NOTICE '1st: 5,000 pts  = ₦500';
  RAISE NOTICE '2nd: 15,000 pts = ₦1,500';
  RAISE NOTICE '3rd: 30,000 pts = ₦3,000';
  RAISE NOTICE '4th: 50,000 pts = ₦5,000';
  RAISE NOTICE '5th: 100,000 pts = ₦10,000';
  RAISE NOTICE '6th+: unlimited';
  RAISE NOTICE '=========================================';
END $$;
