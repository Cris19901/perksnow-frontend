-- Test queries step by step to find exact issue
-- Run each one separately and tell me which one fails

-- Test 1: Can we query posts table alone?
SELECT id, content, user_id, created_at
FROM posts
ORDER BY created_at DESC
LIMIT 5;

-- Test 2: Can we query users table alone?
SELECT id, username, full_name, avatar_url
FROM users
LIMIT 5;

-- Test 3: Can we query post_images table alone?
SELECT id, post_id, image_url, image_order
FROM post_images
LIMIT 5;

-- Test 4: Can we join posts and users?
SELECT
    p.id,
    p.content,
    p.user_id,
    u.username,
    u.full_name
FROM posts p
LEFT JOIN users u ON u.id = p.user_id
ORDER BY p.created_at DESC
LIMIT 5;

-- Test 5: Can we join posts and post_images?
SELECT
    p.id,
    p.content,
    pi.image_url,
    pi.image_order
FROM posts p
LEFT JOIN post_images pi ON pi.post_id = p.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Test 6: Can we join all three tables?
SELECT
    p.id,
    p.content,
    u.username,
    pi.image_url
FROM posts p
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN post_images pi ON pi.post_id = p.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Test 7: Check if anon role can access (this simulates what the frontend does)
SET ROLE anon;

SELECT
    p.id,
    p.content,
    u.username,
    pi.image_url
FROM posts p
LEFT JOIN users u ON u.id = p.user_id
LEFT JOIN post_images pi ON pi.post_id = p.id
ORDER BY p.created_at DESC
LIMIT 3;

RESET ROLE;
