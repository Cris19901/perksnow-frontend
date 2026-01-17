# Likes System Setup Guide

This guide explains how to set up the likes system for posts, products, and reels in your LavLay application.

## What This Migration Does

The `CREATE_LIKES_SYSTEM.sql` migration file creates:

1. **Three likes tables** - `post_likes`, `product_likes`, `reel_likes`
2. **Indexes** - For fast lookups and queries
3. **Likes count columns** - Adds/updates columns in posts, products, and reels tables
4. **Automatic count updates** - Triggers that keep like counts in sync
5. **Helper functions** - To check if user liked content and get who liked it
6. **Security policies** - Row Level Security (RLS) for data protection

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `CREATE_LIKES_SYSTEM.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" message

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push --file CREATE_LIKES_SYSTEM.sql
```

### Option 3: Using psql (Direct Database Connection)

```bash
# Connect to your database
psql "postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# Run the migration
\i CREATE_LIKES_SYSTEM.sql
```

## What Gets Created

### Tables

#### `post_likes` table
```sql
- id (UUID, Primary Key)
- post_id (UUID) - Reference to posts table
- user_id (UUID) - User who liked the post
- created_at (Timestamp)
```

#### `product_likes` table
```sql
- id (UUID, Primary Key)
- product_id (UUID) - Reference to products table
- user_id (UUID) - User who liked the product
- created_at (Timestamp)
```

#### `reel_likes` table
```sql
- id (UUID, Primary Key)
- reel_id (UUID) - Reference to reels table
- user_id (UUID) - User who liked the reel
- created_at (Timestamp)
```

#### Table Updates
```sql
posts.likes_count (Integer) - Number of likes on post
products.likes_count (Integer) - Number of likes on product
reels.likes_count (Integer) - Number of likes on reel
```

### Functions

1. **`has_user_liked_post(user_id, post_id)`**
   - Returns true/false if user has liked a post
   - Example: `SELECT has_user_liked_post('user-uuid', 'post-uuid')`

2. **`has_user_liked_product(user_id, product_id)`**
   - Returns true/false if user has liked a product
   - Example: `SELECT has_user_liked_product('user-uuid', 'product-uuid')`

3. **`has_user_liked_reel(user_id, reel_id)`**
   - Returns true/false if user has liked a reel
   - Example: `SELECT has_user_liked_reel('user-uuid', 'reel-uuid')`

4. **`get_post_likes(post_id, limit, offset)`**
   - Returns list of users who liked a post
   - Example: `SELECT * FROM get_post_likes('post-uuid', 10, 0)`

5. **`get_product_likes(product_id, limit, offset)`**
   - Returns list of users who liked a product
   - Example: `SELECT * FROM get_product_likes('product-uuid', 10, 0)`

6. **`get_reel_likes(reel_id, limit, offset)`**
   - Returns list of users who liked a reel
   - Example: `SELECT * FROM get_reel_likes('reel-uuid', 10, 0)`

### Features

- ✅ Prevents duplicate likes (one like per user per content)
- ✅ Automatic like count updates via triggers
- ✅ Fast queries with proper indexes
- ✅ Secure with Row Level Security policies
- ✅ Cascading deletes (if content or user is deleted, likes are removed)

## Verification

After running the migration, you can verify it worked:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('post_likes', 'product_likes', 'reel_likes');

-- Check if columns were added
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'likes_count'
AND table_name IN ('posts', 'products', 'reels');

-- Test the functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'has_user_liked_post',
  'has_user_liked_product',
  'has_user_liked_reel',
  'get_post_likes',
  'get_product_likes',
  'get_reel_likes'
);
```

## Testing the Likes System

### 1. Like a Post

```sql
-- User likes a post
INSERT INTO post_likes (user_id, post_id)
VALUES (
  'user-uuid',  -- Replace with actual UUID
  'post-uuid'   -- Replace with actual UUID
);
```

### 2. Check Like Count

```sql
-- Check updated count
SELECT id, content, likes_count
FROM posts
WHERE id = 'post-uuid';
```

### 3. Check if User Liked

```sql
-- Check if user liked the post
SELECT has_user_liked_post('user-uuid', 'post-uuid');
```

### 4. Get Users Who Liked

```sql
-- Get list of users who liked the post
SELECT * FROM get_post_likes('post-uuid', 10, 0);
```

### 5. Unlike a Post

```sql
-- User unlikes a post
DELETE FROM post_likes
WHERE user_id = 'user-uuid'
AND post_id = 'post-uuid';
```

## Frontend Integration

The like functionality will be integrated into:

- **Post.tsx** - Like button for regular posts
- **ProductPost.tsx** - Like button for product posts
- **ReelsViewer.tsx** - Like button for reels (already partially implemented)

Each component will have:
- Heart icon that fills when liked
- Like count display
- Optimistic UI updates
- Toast notifications for feedback
- Loading states to prevent double-clicking

## Security

The migration includes Row Level Security (RLS) policies:

- ✅ Anyone can view likes (public information)
- ✅ Only authenticated users can like content
- ✅ Users can only like as themselves (not impersonate)
- ✅ Users can only unlike their own likes

## Troubleshooting

### Error: "relation 'post_likes' already exists"

The tables already exist. You can either:
- Skip the migration (likes system is already set up)
- Drop the tables first: `DROP TABLE post_likes, product_likes, reel_likes CASCADE;` then re-run

### Error: "column 'likes_count' already exists"

The columns already exist. The migration handles this with:
```sql
DO $$ BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE ... ADD COLUMN ...
  END IF;
END $$;
```

### Like counts are incorrect

Re-initialize the counts:
```sql
UPDATE posts
SET likes_count = (
  SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id
);

UPDATE products
SET likes_count = (
  SELECT COUNT(*) FROM product_likes WHERE product_id = products.id
);

UPDATE reels
SET likes_count = (
  SELECT COUNT(*) FROM reel_likes WHERE reel_id = reels.id
);
```

## Next Steps

After running the migration:

1. ✅ Update frontend components with like functionality
2. ✅ Test like/unlike on posts, products, and reels
3. ✅ Verify like counts update correctly
4. ✅ Check RLS policies are working

## Support

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify you have the correct permissions
3. Make sure the `posts`, `products`, and `reels` tables exist with `id` columns as UUID
4. Ensure the `users` table exists with `id` column as UUID

---

**Created by:** Claude Code
**Date:** 2025-01-01
**Version:** 1.0
