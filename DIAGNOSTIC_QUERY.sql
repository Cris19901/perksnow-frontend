-- Comprehensive diagnostic to find the exact issue
-- Run this and share ALL the output with me

-- 1. Check RLS status on all tables
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('posts', 'post_images', 'users', 'post_likes', 'comments', 'follows')
ORDER BY tablename;

-- 2. Check all policies on posts table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text[] as roles,
    cmd as operation,
    qual::text as using_expression
FROM pg_policies
WHERE tablename = 'posts'
ORDER BY policyname;

-- 3. Check all policies on post_images table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text[] as roles,
    cmd as operation,
    qual::text as using_expression
FROM pg_policies
WHERE tablename = 'post_images'
ORDER BY policyname;

-- 4. Check all policies on users table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles::text[] as roles,
    cmd as operation,
    qual::text as using_expression
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- 5. Test if you can query posts directly (as anonymous)
SET ROLE anon;
SELECT COUNT(*) as posts_count FROM posts;
RESET ROLE;

-- 6. Test if you can query post_images directly (as anonymous)
SET ROLE anon;
SELECT COUNT(*) as post_images_count FROM post_images;
RESET ROLE;

-- 7. Test if you can query users directly (as anonymous)
SET ROLE anon;
SELECT COUNT(*) as users_count FROM users;
RESET ROLE;

-- 8. Test the actual feed query (as anonymous)
SET ROLE anon;
SELECT
    p.id,
    p.content,
    p.user_id,
    u.username,
    u.full_name,
    COUNT(pi.id) as image_count
FROM posts p
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN post_images pi ON pi.post_id = p.id
GROUP BY p.id, p.content, p.user_id, u.username, u.full_name
ORDER BY p.created_at DESC
LIMIT 3;
RESET ROLE;

-- 9. Check if there are any posts in the database
SELECT COUNT(*) as total_posts FROM posts;

-- 10. Check if there are any post_images in the database
SELECT COUNT(*) as total_post_images FROM post_images;
