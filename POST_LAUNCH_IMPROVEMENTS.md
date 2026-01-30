# Post-Launch Improvements (Safe & Gradual)

These improvements can be made AFTER launch without breaking existing functionality. Do them gradually, one at a time, with testing between each.

---

## Week 1: Quick Wins (No Breaking Changes)

### 1. Add Database Indexes (15 mins - Huge Performance Gain)

**Impact**: 2-3x faster queries
**Risk**: None (read-only improvement)

```sql
-- Run in Supabase SQL Editor (one at a time)

-- For feed queries (faster post loading)
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc
ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_id_created
ON posts(user_id, created_at DESC);

-- For comments (faster comment loading)
CREATE INDEX IF NOT EXISTS idx_comments_post_id
ON comments(post_id, created_at DESC);

-- For likes (faster like checks)
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post
ON post_likes(user_id, post_id);

-- For subscriptions (faster subscription checks)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
ON subscriptions(user_id, status);

-- For follows (faster follow checks)
CREATE INDEX IF NOT EXISTS idx_follows_follower_following
ON follows(follower_id, following_id);

-- For activities (faster feed queries)
CREATE INDEX IF NOT EXISTS idx_activities_user_created
ON activities(user_id, created_at DESC);
```

**Test**: Reload feed, profile pages. Should feel faster.

---

### 2. Gradually Replace console.log (30 mins)

**Impact**: Cleaner production logs, better debugging
**Risk**: None (only changes logging)

Start with these critical files:

```typescript
// In src/lib/auth.ts
import { logger } from './logger';

// Replace:
console.log('Session expired or expiring soon, refreshing...');
// With:
logger.info('Session expired or expiring soon, refreshing...');

// Keep errors as:
logger.error('Auth error:', error);
```

**Files to update (5-10 per day):**
1. src/lib/auth.ts
2. src/contexts/AuthContext.tsx
3. src/lib/image-upload-presigned.ts
4. src/components/pages/FeedPage.tsx
5. src/components/pages/ProfilePage.tsx

**Test**: Check console in dev (should still see logs), production (no spam).

---

### 3. Add Loading Skeletons (1 hour - Better UX)

**Impact**: Feels faster even if it's not
**Risk**: Low (pure visual improvement)

Example for FeedPage:

```typescript
// Add skeleton component
const PostSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-12 bg-gray-200 rounded-full w-12"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mt-4"></div>
    <div className="h-32 bg-gray-200 rounded mt-4"></div>
  </div>
);

// Use while loading
{loading && (
  <>
    <PostSkeleton />
    <PostSkeleton />
    <PostSkeleton />
  </>
)}
```

---

## Week 2: Database Function for N+1 Queries

### Safe Approach: Create New Function, Test, Then Use

**Step 1**: Create database function (doesn't affect existing code)

```sql
-- Run in Supabase SQL Editor
CREATE OR REPLACE FUNCTION get_profile_data(p_username TEXT, p_viewer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_is_following BOOLEAN;
  v_result JSON;
BEGIN
  -- Get user data
  SELECT *
  INTO v_user
  FROM users
  WHERE username = p_username;

  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if viewer is following
  IF p_viewer_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM follows
      WHERE follower_id = p_viewer_id
      AND following_id = v_user.id
    ) INTO v_is_following;
  ELSE
    v_is_following := FALSE;
  END IF;

  -- Build result with all data in one query
  v_result := json_build_object(
    'user', row_to_json(v_user),
    'is_following', v_is_following,
    'posts', (
      SELECT COALESCE(json_agg(p), '[]'::json)
      FROM (
        SELECT posts.*, row_to_json(users.*) as author
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.user_id = v_user.id
        ORDER BY posts.created_at DESC
        LIMIT 20
      ) p
    ),
    'products', (
      SELECT COALESCE(json_agg(pr), '[]'::json)
      FROM (
        SELECT *
        FROM products
        WHERE seller_id = v_user.id
        LIMIT 20
      ) pr
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_profile_data TO authenticated, anon;
```

**Step 2**: Test in Supabase SQL Editor

```sql
SELECT get_profile_data('testusername', 'your-user-id-here');
```

**Step 3**: Use in ProfilePage.tsx (ONLY AFTER TESTING)

```typescript
// Replace multiple queries with single RPC call
const { data, error } = await supabase
  .rpc('get_profile_data', {
    p_username: username,
    p_viewer_id: user?.id
  });

if (error) throw error;

// Extract data
const profileUser = data.user;
const isFollowing = data.is_following;
const posts = data.posts;
const products = data.products;
```

**Test**: Profile page should load 3-5x faster.

---

## Week 3: Type Safety (Gradual)

### Safe Approach: Fix Types File by File

Generate proper types from database:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

Then gradually update files:

```typescript
// Before (file 1)
const [posts, setPosts] = useState<any[]>([]);

// After (file 1)
import { Database } from '@/types/database';
type Post = Database['public']['Tables']['posts']['Row'];
const [posts, setPosts] = useState<Post[]>([]);
```

Do 5-10 files per day. Test after each file.

---

## Week 4: Code Organization (Low Risk)

### Consolidate Image Upload Files

**Current**: 4 separate files
**Goal**: 1 unified file

**Safe approach**:
1. Create new consolidated file
2. Test it works
3. Gradually replace imports
4. Delete old files LAST

Don't rush this - it's cosmetic.

---

## Performance Monitoring (Optional)

### Add Vercel Analytics (5 mins)

```bash
npm install @vercel/analytics
```

```typescript
// In main.tsx
import { Analytics } from '@vercel/analytics/react';

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
    <Analytics />
  </ErrorBoundary>
);
```

Track real user performance automatically.

---

## General Rules for Safe Improvements

### ✅ DO:
- Test each change in development first
- Deploy one improvement at a time
- Monitor logs after each deployment
- Keep rollback option ready

### ❌ DON'T:
- Change multiple things at once
- Deploy without testing
- Rush improvements
- Touch working payment/auth code unless necessary

---

## Emergency Rollback

If any improvement breaks something:

```bash
# Instant rollback to previous working version
vercel rollback

# Or in Vercel dashboard:
# Your Project → Deployments → Click "..." on previous → Promote to Production
```

---

## Success Metrics

Track these to measure improvement impact:

1. **Page Load Time**
   - Before: 3-6 seconds
   - Target: <1 second

2. **Database Query Time** (Supabase Dashboard → Query Performance)
   - Before: Multiple 100-500ms queries
   - Target: Single <100ms query

3. **User Complaints**
   - Before: "It's slow"
   - Target: "It's fast!"

---

Remember: **Your app works right now.** These improvements make it better, but they're not urgent. Focus on user acquisition first, optimize later!
