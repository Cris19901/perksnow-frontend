-- Complete RLS Fix for Feed Loading Issue
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. Fix post_images table RLS
-- ============================================

-- Drop ALL existing policies on post_images
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'post_images'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON post_images', pol.policyname);
    END LOOP;
END $$;

-- Create fresh policies for post_images
CREATE POLICY "post_images_select_all"
  ON post_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "post_images_insert_own"
  ON post_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid())
  );

CREATE POLICY "post_images_update_own"
  ON post_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid())
  );

CREATE POLICY "post_images_delete_own"
  ON post_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid())
  );

-- Ensure RLS is enabled
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Fix posts table RLS (if needed)
-- ============================================

-- Check if posts table has proper SELECT policy
DO $$
BEGIN
    -- Drop restrictive policies if they exist
    DROP POLICY IF EXISTS "Users can only view their own posts" ON posts;
    DROP POLICY IF EXISTS "Authenticated users can view posts" ON posts;

    -- Create public read policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'posts'
        AND policyname = 'posts_select_all'
    ) THEN
        CREATE POLICY "posts_select_all"
          ON posts FOR SELECT
          TO public
          USING (true);
    END IF;
END $$;

-- ============================================
-- 3. Verify RLS on users table
-- ============================================

-- Ensure users can be read (for author info)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'users'
        AND policyname = 'users_select_all'
    ) THEN
        CREATE POLICY "users_select_all"
          ON users FOR SELECT
          TO public
          USING (true);
    END IF;
END $$;

-- ============================================
-- 4. Test queries
-- ============================================

-- Test 1: Direct post_images query
SELECT COUNT(*) as post_images_count FROM post_images;

-- Test 2: Direct posts query
SELECT COUNT(*) as posts_count FROM posts;

-- Test 3: Join query (what the feed does)
SELECT
    p.id,
    p.content,
    p.created_at,
    u.username,
    u.full_name,
    COUNT(pi.id) as image_count
FROM posts p
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN post_images pi ON pi.post_id = p.id
GROUP BY p.id, p.content, p.created_at, u.username, u.full_name
ORDER BY p.created_at DESC
LIMIT 5;

-- ============================================
-- 5. Display current policies
-- ============================================

SELECT
    tablename,
    policyname,
    cmd as operation,
    roles,
    qual::text as using_clause
FROM pg_policies
WHERE tablename IN ('posts', 'post_images', 'users')
ORDER BY tablename, policyname;

-- ============================================
-- 6. Display RLS status
-- ============================================

SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('posts', 'post_images', 'users')
ORDER BY tablename;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated!';
  RAISE NOTICE '✅ Please refresh your browser and try again';
END $$;
