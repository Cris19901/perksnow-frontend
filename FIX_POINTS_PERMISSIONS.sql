-- ========================================
-- FIX POINTS_TRANSACTIONS TABLE PERMISSIONS
-- ========================================
-- Error: permission denied for table points_transactions
-- This grants proper permissions to authenticated users
-- ========================================

-- Grant SELECT, INSERT on points_transactions table
GRANT SELECT, INSERT ON TABLE public.points_transactions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.points_transactions TO anon;

-- Grant UPDATE on users table (for updating points_balance)
GRANT UPDATE (points_balance) ON TABLE public.users TO authenticated;
GRANT UPDATE (points_balance) ON TABLE public.users TO anon;

-- Grant USAGE on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Enable Row Level Security (RLS) on points_transactions table
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for points_transactions table

-- Policy: Users can view their own transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.points_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.points_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view all transactions (optional - for leaderboards)
-- Uncomment this if you want users to see all transactions
-- DROP POLICY IF EXISTS "Transactions are viewable by everyone" ON public.points_transactions;
-- CREATE POLICY "Transactions are viewable by everyone"
--   ON public.points_transactions
--   FOR SELECT
--   USING (true);

-- Policy: Allow system/triggers to insert transactions
-- This allows the award_points() function to insert transactions
DROP POLICY IF EXISTS "System can insert transactions" ON public.points_transactions;
CREATE POLICY "System can insert transactions"
  ON public.points_transactions
  FOR INSERT
  WITH CHECK (true);

-- Alternative: Only authenticated users can earn points
-- Use this if you want stricter control
-- DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.points_transactions;
-- CREATE POLICY "Users can insert their own transactions"
--   ON public.points_transactions
--   FOR INSERT
--   WITH CHECK (auth.uid() = user_id);

-- Verify the permissions
SELECT
  schemaname,
  tablename,
  tableowner,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'points_transactions'
ORDER BY tablename;

-- Verify the policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'points_transactions'
ORDER BY tablename, policyname;

-- Test the award_points function
-- This should work after applying the permissions
-- SELECT award_points(auth.uid(), 50, 'reel_upload', 'Test reel upload');
