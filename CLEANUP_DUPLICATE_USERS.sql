-- ============================================================================
-- Clean Up Duplicate Users Script
-- ============================================================================
-- This script removes duplicate/test users from the database
-- Run this in Supabase SQL Editor if you have duplicate user errors
-- ============================================================================

-- 1. Check for duplicate users
SELECT
  id,
  email,
  username,
  created_at
FROM users
ORDER BY created_at DESC;

-- ============================================================================
-- OPTION 1: Delete ALL users (if safe to do so - use for testing/development only)
-- ============================================================================
-- DANGER: This will delete all users! Only use if this is a test database
-- Uncomment the following lines to execute:

-- DELETE FROM user_onboarding_progress;
-- DELETE FROM scheduled_emails;
-- DELETE FROM post_comments;
-- DELETE FROM post_likes;
-- DELETE FROM product_likes;
-- DELETE FROM reel_likes;
-- DELETE FROM reel_comments;
-- DELETE FROM posts;
-- DELETE FROM products;
-- DELETE FROM reels;
-- DELETE FROM users;

-- ============================================================================
-- OPTION 2: Delete specific test users (safer)
-- ============================================================================
-- Delete a specific user by email
-- Replace 'test@example.com' with the actual email of the duplicate user

-- DELETE FROM users WHERE email = 'test@example.com';

-- ============================================================================
-- OPTION 3: Keep only the most recent user per email (if you have duplicates)
-- ============================================================================

-- First, see which emails have duplicates:
SELECT
  email,
  COUNT(*) as count
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Then delete older duplicates (keeping the newest):
-- Uncomment to execute:

-- DELETE FROM users
-- WHERE id NOT IN (
--   SELECT DISTINCT ON (email) id
--   FROM users
--   ORDER BY email, created_at DESC
-- );

-- ============================================================================
-- Verify cleanup
-- ============================================================================
-- Run this after cleanup to verify:

SELECT
  COUNT(*) as total_users,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(DISTINCT username) as unique_usernames
FROM users;

-- ============================================================================
-- Reset auto-increment sequences (if needed)
-- ============================================================================
-- This ensures IDs don't conflict after cleanup

-- For posts
SELECT setval('posts_id_seq', COALESCE((SELECT MAX(id) FROM posts), 1), true);

-- For products
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1), true);

-- ============================================================================
