-- Progressive withdrawal limits
-- Points conversion: 10 points = ₦1
--
-- Withdrawal # | Limit (pts) | Limit (NGN)
-- -------------|-------------|------------
-- 1st          |    5,000    |    ₦500
-- 2nd          |   15,000    |  ₦1,500
-- 3rd          |   30,000    |  ₦3,000
-- 4th          |   50,000    |  ₦5,000
-- 5th          |  100,000    | ₦10,000
-- 6th+         |  unlimited  | unlimited

-- ─────────────────────────────────────────────────────────────
-- 1. Add successful_withdrawals_count to users (idempotent)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS successful_withdrawals_count INT NOT NULL DEFAULT 0;

-- Backfill any users who already have completed withdrawals
-- (safe to run multiple times — uses COUNT which is idempotent)
UPDATE users u
SET successful_withdrawals_count = (
  SELECT COUNT(*)
  FROM wallet_withdrawals ww
  WHERE ww.user_id = u.id
    AND ww.status = 'completed'
);

-- ─────────────────────────────────────────────────────────────
-- 2. RPC: get_max_withdrawal_amount(p_user_id)
--    Returns the max POINTS the user may withdraw next.
--    Returns NULL for unlimited (6th withdrawal onward).
-- ─────────────────────────────────────────────────────────────
-- Drop first to allow changing the return type if it existed before
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

  -- If user not found, default to most restrictive limit
  IF NOT FOUND THEN
    RETURN 5000;
  END IF;

  RETURN CASE v_count
    WHEN 0 THEN   5000   -- 1st withdrawal: ₦500
    WHEN 1 THEN  15000   -- 2nd withdrawal: ₦1,500
    WHEN 2 THEN  30000   -- 3rd withdrawal: ₦3,000
    WHEN 3 THEN  50000   -- 4th withdrawal: ₦5,000
    WHEN 4 THEN 100000   -- 5th withdrawal: ₦10,000
    ELSE NULL            -- 6th+: unlimited (frontend keeps 999999999 default)
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_max_withdrawal_amount(UUID) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. Trigger function: increment count when status → 'completed'
--    Fires AFTER UPDATE only, guards against double-counting.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_successful_withdrawals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when the status transitions INTO 'completed'
  -- (not when it was already 'completed' before this update)
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE users
    SET successful_withdrawals_count = COALESCE(successful_withdrawals_count, 0) + 1
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the withdrawal update due to counter error
  RAISE WARNING 'increment_successful_withdrawals error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop and recreate so this migration is safe to re-run
DROP TRIGGER IF EXISTS trg_increment_successful_withdrawals ON wallet_withdrawals;

CREATE TRIGGER trg_increment_successful_withdrawals
  AFTER UPDATE ON wallet_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION increment_successful_withdrawals();

-- ─────────────────────────────────────────────────────────────
-- 4. Verification query (visible in migration logs)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Progressive withdrawal limits applied';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '1st withdrawal: 5,000 pts  = ₦500';
  RAISE NOTICE '2nd withdrawal: 15,000 pts = ₦1,500';
  RAISE NOTICE '3rd withdrawal: 30,000 pts = ₦3,000';
  RAISE NOTICE '4th withdrawal: 50,000 pts = ₦5,000';
  RAISE NOTICE '5th withdrawal: 100,000 pts = ₦10,000';
  RAISE NOTICE '6th+ withdrawal: unlimited';
  RAISE NOTICE '=========================================';
END $$;
