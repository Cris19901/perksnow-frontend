-- Run this in Supabase to verify policies were created correctly

-- 1. Check if RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'post_images';

-- 2. List all policies on post_images
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE tablename = 'post_images'
ORDER BY policyname;

-- 3. Test if you can query post_images directly
SELECT COUNT(*) as total_images FROM post_images;

-- 4. Check if posts table also has RLS issues
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'posts';

-- 5. List posts table policies
SELECT
    policyname,
    cmd as operation
FROM pg_policies
WHERE tablename = 'posts';

-- 6. Test a join query (this is what the feed does)
SELECT
    p.id,
    p.content,
    COUNT(pi.id) as image_count
FROM posts p
LEFT JOIN post_images pi ON pi.post_id = p.id
GROUP BY p.id, p.content
LIMIT 5;
