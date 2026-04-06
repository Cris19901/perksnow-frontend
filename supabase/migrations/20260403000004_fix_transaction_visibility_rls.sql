-- Comprehensive RLS fix for all transaction-related tables
-- Ensures users can see their own rows; service_role and admins see all.

-- ============================================================
-- 1. wallet_withdrawals
-- ============================================================
ALTER TABLE wallet_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals"   ON wallet_withdrawals;
DROP POLICY IF EXISTS "Users can create own withdrawals" ON wallet_withdrawals;
DROP POLICY IF EXISTS "Admins can view all withdrawals"  ON wallet_withdrawals;
DROP POLICY IF EXISTS "Service role full access withdrawals" ON wallet_withdrawals;

CREATE POLICY "Users can view own withdrawals"
  ON wallet_withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawals"
  ON wallet_withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and update any withdrawal
CREATE POLICY "Admins can view all withdrawals"
  ON wallet_withdrawals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update withdrawals"
  ON wallet_withdrawals FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT ON wallet_withdrawals TO authenticated;
GRANT ALL ON wallet_withdrawals TO service_role;

-- ============================================================
-- 2. points_transactions
-- ============================================================
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own points transactions"   ON points_transactions;
DROP POLICY IF EXISTS "Users can insert own points transactions" ON points_transactions;
DROP POLICY IF EXISTS "System can insert points transactions"    ON points_transactions;
DROP POLICY IF EXISTS "Admins can view all points transactions"  ON points_transactions;

CREATE POLICY "Users can view own points transactions"
  ON points_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Allow authenticated triggers (via service_role) and direct inserts by owner
CREATE POLICY "Users can insert own points transactions"
  ON points_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all points transactions"
  ON points_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT ON points_transactions TO authenticated;
GRANT ALL ON points_transactions TO service_role;

-- ============================================================
-- 3. earnings
-- ============================================================
ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own earnings"  ON earnings;
DROP POLICY IF EXISTS "Admins can view all earnings" ON earnings;

CREATE POLICY "Users can view own earnings"
  ON earnings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all earnings"
  ON earnings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT ON earnings TO authenticated;
GRANT ALL ON earnings TO service_role;

-- ============================================================
-- 4. payment_transactions (reinforce — was partially fixed before)
-- ============================================================
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions"   ON payment_transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions"  ON payment_transactions;

CREATE POLICY "Users can view own transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT ON payment_transactions TO authenticated;
GRANT ALL ON payment_transactions TO service_role;

-- ============================================================
-- 5. subscriptions
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions"   ON subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions"  ON subscriptions;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

GRANT SELECT, INSERT ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role;
