-- LavLay Database Verification Script
-- Run this in Supabase SQL Editor to verify all tables and policies are correct

-- ============================================
-- 1. CHECK ALL REQUIRED TABLES EXIST
-- ============================================
SELECT
  tablename,
  CASE
    WHEN tablename IN (
      'users', 'posts', 'post_images', 'post_likes', 'comments',
      'follows', 'reels', 'stories', 'products', 'subscription_plans',
      'subscriptions', 'payment_transactions', 'points_transactions'
    ) THEN '✅ Required'
    ELSE '⚠️ Extra'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================
SELECT
  tablename,
  CASE
    WHEN rowsecurity = true THEN '✅ Enabled'
    ELSE '❌ DISABLED - FIX REQUIRED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 3. CHECK POST_IMAGES TABLE STRUCTURE
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'post_images'
ORDER BY ordinal_position;

-- ============================================
-- 4. VERIFY POST_IMAGES RLS POLICIES
-- ============================================
SELECT
  policyname,
  cmd as operation,
  qual as using_clause,
  with_check as check_clause
FROM pg_policies
WHERE tablename = 'post_images';

-- ============================================
-- 5. CHECK FOR POST_IMAGES TRIGGER
-- ============================================
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'posts'
  AND trigger_name LIKE '%images_count%';

-- ============================================
-- 6. VERIFY SUBSCRIPTION TABLES EXIST
-- ============================================
SELECT
  table_name,
  CASE
    WHEN table_name = 'subscription_plans' THEN '✅ Plans table'
    WHEN table_name = 'subscriptions' THEN '✅ Subscriptions table'
    WHEN table_name = 'payment_transactions' THEN '✅ Transactions table'
    ELSE '⚠️ Unknown'
  END as purpose
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('subscription_plans', 'subscriptions', 'payment_transactions');

-- ============================================
-- 7. CHECK SUBSCRIPTION PLANS DATA
-- ============================================
SELECT
  name,
  display_name,
  price_monthly,
  price_yearly,
  currency,
  is_active,
  sort_order
FROM subscription_plans
ORDER BY sort_order;

-- Expected output:
-- free | Free | 0 | 0 | NGN | true | 1
-- basic | Basic | 2000 | 20000 | NGN | true | 2
-- pro | Pro | 5000 | 50000 | NGN | true | 3

-- ============================================
-- 8. VERIFY STORAGE BUCKETS (Run in Storage tab)
-- ============================================
-- Manual check required:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Verify these buckets exist:
--    ✅ posts
--    ✅ avatars
--    ✅ covers
--    ✅ stories
--    ✅ reels
-- 3. Check each bucket has "Public" policy enabled for SELECT

-- ============================================
-- 9. TEST MULTI-IMAGE POST QUERY
-- ============================================
-- This query should work without errors (tests RLS and joins)
SELECT
  p.id,
  p.content,
  p.images_count,
  COUNT(pi.id) as actual_image_count,
  u.username,
  u.full_name
FROM posts p
LEFT JOIN post_images pi ON pi.post_id = p.id
LEFT JOIN users u ON u.id = p.user_id
WHERE p.images_count > 0
GROUP BY p.id, p.content, p.images_count, u.username, u.full_name
LIMIT 5;

-- ============================================
-- 10. CHECK FOR ANY POSTS WITH IMAGES
-- ============================================
SELECT
  COUNT(*) as total_posts,
  COUNT(CASE WHEN images_count > 0 THEN 1 END) as posts_with_images,
  COUNT(CASE WHEN images_count = 0 THEN 1 END) as posts_without_images,
  MAX(images_count) as max_images_in_post
FROM posts;

-- ============================================
-- 11. VERIFY POST_IMAGES DATA INTEGRITY
-- ============================================
SELECT
  pi.post_id,
  p.images_count as declared_count,
  COUNT(pi.id) as actual_count,
  CASE
    WHEN p.images_count = COUNT(pi.id) THEN '✅ Match'
    ELSE '❌ MISMATCH - Run update trigger'
  END as status
FROM post_images pi
JOIN posts p ON p.id = pi.post_id
GROUP BY pi.post_id, p.images_count
HAVING p.images_count != COUNT(pi.id);

-- If any mismatches found, fix with:
-- UPDATE posts SET images_count = (
--   SELECT COUNT(*) FROM post_images WHERE post_id = posts.id
-- );

-- ============================================
-- 12. CHECK FOLLOWS TABLE STRUCTURE
-- ============================================
SELECT
  COUNT(*) as total_follows,
  COUNT(DISTINCT follower_id) as unique_followers,
  COUNT(DISTINCT following_id) as unique_following
FROM follows;

-- ============================================
-- SUMMARY CHECKLIST
-- ============================================
-- Run all queries above and verify:
-- [ ] All required tables exist
-- [ ] RLS is enabled on all tables
-- [ ] post_images table has correct structure
-- [ ] post_images RLS policies allow public read
-- [ ] update_post_images_count trigger exists
-- [ ] Subscription tables exist (subscription_plans, subscriptions, payment_transactions)
-- [ ] Subscription plans have data (free, basic, pro)
-- [ ] Storage buckets exist (posts, avatars, covers, stories, reels)
-- [ ] Multi-image post query works
-- [ ] Posts with images exist or can be created
-- [ ] Post image counts are accurate
-- [ ] Follows table is working

-- ============================================
-- COMMON ISSUES & FIXES
-- ============================================

-- Issue 1: RLS not enabled
-- Fix: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Issue 2: post_images permission denied
-- Fix: See FIX_POST_IMAGES_RLS.sql

-- Issue 3: Images count mismatch
-- Fix: Run trigger manually or update posts table

-- Issue 4: Missing subscription plans
-- Fix: Insert default plans (see below)

-- Default subscription plans insert:
/*
INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, currency, features, limits, sort_order, is_active)
VALUES
  ('free', 'Free', 'Basic features to get started', 0, 0, 'NGN',
   '{"ad_free": false, "priority_support": false}'::jsonb,
   '{"max_posts_per_day": 10, "max_reels_per_day": 5, "can_withdraw": false, "verified_badge": false}'::jsonb,
   1, true),
  ('basic', 'Basic', 'More posts and basic features', 2000, 20000, 'NGN',
   '{"ad_free": true, "priority_support": false}'::jsonb,
   '{"max_posts_per_day": 50, "max_reels_per_day": 20, "can_withdraw": true, "verified_badge": false}'::jsonb,
   2, true),
  ('pro', 'Pro', 'Unlimited posts and premium features', 5000, 50000, 'NGN',
   '{"ad_free": true, "priority_support": true}'::jsonb,
   '{"max_posts_per_day": -1, "max_reels_per_day": -1, "can_withdraw": true, "verified_badge": true}'::jsonb,
   3, true);
*/
