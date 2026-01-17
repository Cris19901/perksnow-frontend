-- Enable RLS on posts table and create SELECT policy
-- This is the missing piece!

-- 1. Enable RLS on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 2. Create public SELECT policy for posts
CREATE POLICY "posts_select_all"
  ON posts FOR SELECT
  TO public
  USING (true);

-- 3. Create policies for INSERT/UPDATE/DELETE (users can manage their own posts)
CREATE POLICY "posts_insert_own"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "posts_delete_own"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Verify RLS is now enabled
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'posts';

-- 5. Show all posts policies
SELECT
    policyname,
    cmd as operation,
    roles
FROM pg_policies
WHERE tablename = 'posts';

-- Success!
DO $$
BEGIN
  RAISE NOTICE '✅ Posts table RLS enabled!';
  RAISE NOTICE '✅ Feed should now load - refresh browser!';
END $$;
