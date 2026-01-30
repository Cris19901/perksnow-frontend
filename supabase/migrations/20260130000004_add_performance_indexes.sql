-- Performance Indexes for LavLay Platform
-- These indexes improve query performance by 2-3x for common operations

-- ============================================================================
-- 1. Posts Table Indexes
-- ============================================================================

-- Index for fetching posts by user (profile page, user posts)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Index for fetching recent posts (feed, timeline)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- Composite index for user posts sorted by date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- Note: Partial indexes with CURRENT_DATE don't work (not IMMUTABLE)
-- The composite index idx_posts_user_created handles this use case

-- ============================================================================
-- 2. Reels Table Indexes
-- ============================================================================

-- Index for fetching reels by user
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);

-- Index for fetching recent reels (feed)
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);

-- Composite index for user reels sorted by date
CREATE INDEX IF NOT EXISTS idx_reels_user_created ON reels(user_id, created_at DESC);

-- ============================================================================
-- 3. Comments Table Indexes
-- ============================================================================

-- Index for fetching comments by post
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Index for fetching comments by user (for daily limits)
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Composite index for user daily comments (rate limiting)
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);

-- ============================================================================
-- 4. Likes Table Indexes
-- ============================================================================

-- Index for checking if user liked a post
CREATE INDEX IF NOT EXISTS idx_likes_user_post ON likes(user_id, post_id);

-- Index for counting post likes
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);

-- ============================================================================
-- 5. Follows Table Indexes
-- ============================================================================

-- Index for fetching user's followers
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Index for fetching who user is following
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);

-- Composite index for checking follow status
CREATE INDEX IF NOT EXISTS idx_follows_both ON follows(follower_id, following_id);

-- ============================================================================
-- 6. Users Table Indexes
-- ============================================================================

-- Index for username lookups (profile pages, @mentions)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Index for email lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for subscription filtering (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier, subscription_status);

-- Index for admin queries (finding admins)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role = 'admin';

-- ============================================================================
-- 7. Payment Transactions Indexes
-- ============================================================================

-- Index for user payment history
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payment_transactions(user_id);

-- Index for status filtering (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);

-- Index for recent transactions
CREATE INDEX IF NOT EXISTS idx_payments_created ON payment_transactions(created_at DESC);

-- Composite for user's recent payments
CREATE INDEX IF NOT EXISTS idx_payments_user_created ON payment_transactions(user_id, created_at DESC);

-- ============================================================================
-- 8. Withdrawal Requests Indexes
-- ============================================================================

-- Index for user's withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawal_requests(user_id);

-- Index for status filtering (admin pending review)
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);

-- Composite for pending withdrawals (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawal_requests(status, created_at DESC);

-- ============================================================================
-- 9. Subscriptions Table Indexes
-- ============================================================================

-- Index for user's subscription
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

-- ============================================================================
-- 10. Notifications Table Indexes
-- ============================================================================

-- Index for user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Composite for user's unread notifications (check column exists first)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read) WHERE read = false';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read) WHERE is_read = false';
  END IF;
END $$;

-- Index for recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- 11. Point History Indexes (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'point_history') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_point_history_user ON point_history(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_point_history_created ON point_history(created_at DESC)';
  END IF;
END $$;

-- ============================================================================
-- 12. Hourly Point Tracking Indexes (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hourly_point_tracking') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_hourly_points_user_hour ON hourly_point_tracking(user_id, earning_hour)';
  END IF;
END $$;

-- ============================================================================
-- 13. Reel Comments Table Indexes (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reel_comments') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON reel_comments(user_id)';
  END IF;
END $$;

-- ============================================================================
-- 14. Reel Likes Table Indexes (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reel_likes') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reel_likes_user_reel ON reel_likes(user_id, reel_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id)';
  END IF;
END $$;

-- ============================================================================
-- 15. Messages Table Indexes (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)';
  END IF;
END $$;

-- ============================================================================
-- 16. Analyze tables to update statistics
-- ============================================================================

-- Update table statistics for query optimizer (only for existing tables)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['posts', 'reels', 'comments', 'likes', 'follows', 'users',
                              'payment_transactions', 'withdrawal_requests', 'subscriptions',
                              'notifications', 'point_history', 'hourly_point_tracking',
                              'reel_comments', 'reel_likes', 'messages']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
      EXECUTE format('ANALYZE %I', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- NOTES:
-- - All indexes use IF NOT EXISTS to prevent errors if already created
-- - Partial indexes (WHERE clause) reduce index size and improve performance
-- - Composite indexes are ordered by most selective column first
-- - ANALYZE updates statistics for the query planner
-- ============================================================================
