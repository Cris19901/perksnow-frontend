# Database Migration Examples

This document contains real-world examples of safe database migrations for your LavLay platform.

---

## Table of Contents

1. [Basic Migrations](#basic-migrations)
2. [Complex Migrations](#complex-migrations)
3. [Common Pitfalls](#common-pitfalls)
4. [Real-World Scenarios](#real-world-scenarios)

---

## Basic Migrations

### 1. Adding a New Table

**Scenario:** Add bookmarks feature

```sql
-- migrations/add_bookmarks_table.sql

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate bookmarks
  UNIQUE(user_id, post_id)
);

-- Add index for fast lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user_id
ON bookmarks(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_post_id
ON bookmarks(post_id);

-- Enable Row Level Security
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own bookmarks
CREATE POLICY "Users can view own bookmarks"
ON bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to create their own bookmarks
CREATE POLICY "Users can create own bookmarks"
ON bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
ON bookmarks FOR DELETE
USING (auth.uid() = user_id);
```

**Rollback:**
```sql
-- migrations/add_bookmarks_table_rollback.sql
DROP TABLE IF EXISTS bookmarks;
```

---

### 2. Adding a Column

**Scenario:** Add "verified" badge to users

```sql
-- migrations/add_verified_column.sql

-- Add verified column with default value
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.verified IS 'Whether user account is verified';

-- Optionally create index if you'll filter by this often
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verified
ON users(verified) WHERE verified = true;
```

**Rollback:**
```sql
-- migrations/add_verified_column_rollback.sql
ALTER TABLE users DROP COLUMN IF EXISTS verified;
```

---

### 3. Adding Multiple Related Columns

**Scenario:** Add user profile enhancements

```sql
-- migrations/add_user_profile_fields.sql

-- Add all fields at once
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profile_visible": true,
  "show_email": false,
  "show_phone": false
}'::jsonb;

-- Add constraints
ALTER TABLE users
ADD CONSTRAINT check_website_format
CHECK (website IS NULL OR website ~ '^https?://');

-- Add comments
COMMENT ON COLUMN users.bio IS 'User biography (max 500 chars)';
COMMENT ON COLUMN users.website IS 'User website URL';
COMMENT ON COLUMN users.privacy_settings IS 'User privacy preferences';
```

**Rollback:**
```sql
-- migrations/add_user_profile_fields_rollback.sql
ALTER TABLE users
DROP COLUMN IF EXISTS bio,
DROP COLUMN IF EXISTS website,
DROP COLUMN IF EXISTS location,
DROP COLUMN IF EXISTS birth_date,
DROP COLUMN IF EXISTS privacy_settings;
```

---

### 4. Creating Indexes for Performance

**Scenario:** Speed up slow queries

```sql
-- migrations/add_performance_indexes.sql

-- Index for posts by user (common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_created
ON posts(user_id, created_at DESC);

-- Index for searching posts by content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_search
ON posts USING GIN (to_tsvector('english', content));

-- Index for finding recent comments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_created
ON comments(post_id, created_at DESC);

-- Composite index for feed queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_feed
ON posts(created_at DESC, user_id)
WHERE deleted_at IS NULL;
```

**Rollback:**
```sql
-- migrations/add_performance_indexes_rollback.sql
DROP INDEX CONCURRENTLY IF EXISTS idx_posts_user_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_posts_content_search;
DROP INDEX CONCURRENTLY IF EXISTS idx_comments_post_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_posts_feed;
```

---

## Complex Migrations

### 5. Renaming a Column (Multi-Phase)

**Scenario:** Rename `name` to `full_name` in users table

**Phase 1: Add new column (Week 1)**
```sql
-- migrations/rename_name_to_full_name_phase1.sql

-- Add new column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Copy existing data
UPDATE users
SET full_name = name
WHERE full_name IS NULL;

-- Make it not null after data copied
ALTER TABLE users
ALTER COLUMN full_name SET NOT NULL;
```

**Phase 2: Update application code (Week 1-2)**
```typescript
// Update code to write to BOTH columns
await supabase
  .from('users')
  .update({
    name: fullName,       // Keep writing to old column
    full_name: fullName   // Also write to new column
  });

// Read from new column, fall back to old
const displayName = user.full_name || user.name;
```

**Phase 3: Remove old column (Week 3)**
```sql
-- migrations/rename_name_to_full_name_phase3.sql

-- Drop old column
ALTER TABLE users
DROP COLUMN IF EXISTS name;
```

---

### 6. Changing Column Type

**Scenario:** Change price from INTEGER to DECIMAL

**Phase 1: Add new column**
```sql
-- migrations/change_price_to_decimal_phase1.sql

-- Add new column with correct type
ALTER TABLE products
ADD COLUMN IF NOT EXISTS price_decimal DECIMAL(10, 2);

-- Migrate data (cents to dollars)
UPDATE products
SET price_decimal = price::DECIMAL / 100
WHERE price_decimal IS NULL;
```

**Phase 2: Update code**
```typescript
// Write to both columns temporarily
await supabase
  .from('products')
  .update({
    price: Math.round(priceDecimal * 100),  // Old: cents
    price_decimal: priceDecimal              // New: dollars
  });
```

**Phase 3: Complete migration**
```sql
-- migrations/change_price_to_decimal_phase3.sql

-- Drop old column
ALTER TABLE products
DROP COLUMN IF EXISTS price;

-- Rename new column
ALTER TABLE products
RENAME COLUMN price_decimal TO price;

-- Make it required
ALTER TABLE products
ALTER COLUMN price SET NOT NULL;
```

---

### 7. Splitting a Table

**Scenario:** Split user_settings into separate table

**Phase 1: Create new table**
```sql
-- migrations/split_user_settings_phase1.sql

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  theme VARCHAR(20) DEFAULT 'light',
  language VARCHAR(10) DEFAULT 'en',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Migrate existing data
INSERT INTO user_preferences (user_id, theme, notifications_enabled)
SELECT
  id,
  settings->>'theme',
  (settings->>'notifications')::BOOLEAN
FROM users
WHERE settings IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
ON user_preferences FOR ALL
USING (auth.uid() = user_id);
```

**Phase 2: Update code to use new table**

**Phase 3: Remove old column**
```sql
-- migrations/split_user_settings_phase3.sql

ALTER TABLE users
DROP COLUMN IF EXISTS settings;
```

---

### 8. Adding Foreign Key Constraint

**Scenario:** Ensure post authors exist

```sql
-- migrations/add_post_author_fk.sql

-- First, clean up orphaned records
DELETE FROM posts
WHERE user_id NOT IN (SELECT id FROM users);

-- Then add the constraint
ALTER TABLE posts
ADD CONSTRAINT fk_posts_user_id
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;
```

**Rollback:**
```sql
-- migrations/add_post_author_fk_rollback.sql

ALTER TABLE posts
DROP CONSTRAINT IF EXISTS fk_posts_user_id;
```

---

## Common Pitfalls

### ❌ Pitfall 1: Adding NOT NULL Without Default

**WRONG:**
```sql
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN NOT NULL;
-- ERROR: column "email_verified" contains null values
```

**RIGHT:**
```sql
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT false NOT NULL;
-- OR
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT false;
```

---

### ❌ Pitfall 2: Creating Index Without CONCURRENTLY

**WRONG:**
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
-- Table locked during creation! Users can't write to posts!
```

**RIGHT:**
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id
ON posts(user_id);
-- No table lock, zero downtime
```

---

### ❌ Pitfall 3: Forgetting IF NOT EXISTS

**WRONG:**
```sql
CREATE TABLE bookmarks (...);
-- ERROR if you run twice: relation "bookmarks" already exists
```

**RIGHT:**
```sql
CREATE TABLE IF NOT EXISTS bookmarks (...);
-- Safe to run multiple times
```

---

### ❌ Pitfall 4: Dropping Column Immediately

**WRONG:**
```sql
-- Day 1: Drop column
ALTER TABLE users DROP COLUMN phone_number;
-- Application crashes: column "phone_number" doesn't exist
```

**RIGHT:**
```sql
-- Week 1: Make column optional in code
-- Week 2: Stop using column in code
-- Week 3: Drop column
ALTER TABLE users DROP COLUMN IF EXISTS phone_number;
```

---

## Real-World Scenarios

### Scenario 1: Add Post Categories

**Complete Migration:**

```sql
-- migrations/add_post_categories.sql

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add some default categories
INSERT INTO categories (name, slug, description) VALUES
  ('Technology', 'technology', 'Posts about technology and gadgets'),
  ('Lifestyle', 'lifestyle', 'Posts about lifestyle and daily life'),
  ('Business', 'business', 'Posts about business and entrepreneurship'),
  ('Entertainment', 'entertainment', 'Posts about movies, music, and fun')
ON CONFLICT (slug) DO NOTHING;

-- 3. Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS post_categories (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, category_id)
);

-- 4. Add indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_categories_post
ON post_categories(post_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_categories_category
ON post_categories(category_id);

-- 5. Enable RLS
ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post categories"
ON post_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Post authors can manage categories"
ON post_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM posts
    WHERE posts.id = post_categories.post_id
    AND posts.user_id = auth.uid()
  )
);
```

---

### Scenario 2: Add User Followers System

```sql
-- migrations/add_followers_system.sql

-- 1. Create followers table
CREATE TABLE IF NOT EXISTS followers (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Can't follow yourself
  CHECK (follower_id != following_id),

  -- Can't follow same person twice
  PRIMARY KEY (follower_id, following_id)
);

-- 2. Add indexes for common queries
-- "Who am I following?"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followers_follower
ON followers(follower_id, created_at DESC);

-- "Who follows me?"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_followers_following
ON followers(following_id, created_at DESC);

-- 3. Add follower counts to users (denormalized for performance)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 4. Create function to update counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE users SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

    -- Increment followers count for following
    UPDATE users SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE users SET following_count = following_count - 1
    WHERE id = OLD.follower_id;

    -- Decrement followers count for following
    UPDATE users SET followers_count = followers_count - 1
    WHERE id = OLD.following_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger
DROP TRIGGER IF EXISTS trigger_update_follower_counts ON followers;
CREATE TRIGGER trigger_update_follower_counts
AFTER INSERT OR DELETE ON followers
FOR EACH ROW
EXECUTE FUNCTION update_follower_counts();

-- 6. Enable RLS
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view follower relationships
CREATE POLICY "Anyone can view followers"
ON followers FOR SELECT
TO authenticated
USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
ON followers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow"
ON followers FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- 7. Initialize counts for existing users
UPDATE users u SET
  followers_count = (
    SELECT COUNT(*) FROM followers WHERE following_id = u.id
  ),
  following_count = (
    SELECT COUNT(*) FROM followers WHERE follower_id = u.id
  );
```

---

### Scenario 3: Add Soft Deletes to Posts

```sql
-- migrations/add_soft_deletes_posts.sql

-- 1. Add deleted_at column
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 2. Add index for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_deleted_at
ON posts(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Create view for active posts (optional but useful)
CREATE OR REPLACE VIEW active_posts AS
SELECT * FROM posts
WHERE deleted_at IS NULL;

-- 4. Update RLS policies to exclude deleted posts
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
CREATE POLICY "Anyone can view active posts"
ON posts FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

-- 5. Add policy for viewing own deleted posts
CREATE POLICY "Users can view own deleted posts"
ON posts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6. Create function to soft delete
CREATE OR REPLACE FUNCTION soft_delete_post(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET deleted_at = NOW()
  WHERE id = post_id
  AND user_id = auth.uid()
  AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to restore post
CREATE OR REPLACE FUNCTION restore_post(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE posts
  SET deleted_at = NULL
  WHERE id = post_id
  AND user_id = auth.uid()
  AND deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage in code:**
```typescript
// Soft delete
await supabase.rpc('soft_delete_post', { post_id: '...' });

// Restore
await supabase.rpc('restore_post', { post_id: '...' });

// Query active posts (automatic with RLS)
const { data } = await supabase
  .from('posts')
  .select('*');  // Only returns non-deleted posts
```

---

## Migration Testing Checklist

Before running migration in production:

- [ ] Migration uses `IF NOT EXISTS` / `IF EXISTS`
- [ ] New columns have `DEFAULT` values
- [ ] Indexes use `CONCURRENTLY` keyword
- [ ] RLS policies are set correctly
- [ ] Foreign keys have `ON DELETE` clause
- [ ] Tested on local database
- [ ] Tested on copy of production data
- [ ] Rollback script created and tested
- [ ] No data loss (verified with COUNT queries)
- [ ] Performance impact assessed
- [ ] Code is updated to use new schema

---

## Quick Command Reference

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'your_table_name'
);

-- Check if column exists
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'your_table' AND column_name = 'your_column'
);

-- Check if index exists
SELECT EXISTS (
  SELECT FROM pg_indexes
  WHERE tablename = 'your_table' AND indexname = 'your_index'
);

-- List all indexes on a table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'your_table';

-- Check table size
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename = 'your_table';

-- Check constraint information
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'your_table';
```

---

**Remember: Always test migrations on a copy of production data before running on production!** 🛡️
