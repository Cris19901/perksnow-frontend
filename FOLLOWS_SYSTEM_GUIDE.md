# Follows System Setup Guide

This guide explains how to set up the follows/friends system for your LavLay application.

## What This Migration Does

The `CREATE_FOLLOWS_SYSTEM.sql` migration file creates:

1. **`follows` table** - Stores follow relationships between users
2. **Indexes** - For fast lookups and queries
3. **Follower/Following counts** - Adds columns to users table
4. **Automatic count updates** - Triggers that keep counts in sync
5. **Helper functions** - To get followers/following lists
6. **Security policies** - Row Level Security (RLS) for data protection

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `CREATE_FOLLOWS_SYSTEM.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" message

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push --file CREATE_FOLLOWS_SYSTEM.sql
```

### Option 3: Using psql (Direct Database Connection)

```bash
# Connect to your database
psql "postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# Run the migration
\i CREATE_FOLLOWS_SYSTEM.sql
```

## What Gets Created

### Tables

#### `follows` table
```sql
- id (UUID, Primary Key)
- follower_id (UUID) - User who is following
- following_id (UUID) - User being followed
- created_at (Timestamp)
```

#### `users` table additions
```sql
- followers_count (Integer) - Number of followers
- following_count (Integer) - Number of users being followed
```

### Functions

1. **`get_user_followers(user_id, limit, offset)`**
   - Returns list of users following a specific user
   - Example: `SELECT * FROM get_user_followers('user-uuid-here', 10, 0)`

2. **`get_user_following(user_id, limit, offset)`**
   - Returns list of users that a specific user is following
   - Example: `SELECT * FROM get_user_following('user-uuid-here', 10, 0)`

3. **`is_following(follower_id, following_id)`**
   - Returns true/false if user A is following user B
   - Example: `SELECT is_following('uuid-a', 'uuid-b')`

### Features

- ✅ Prevents self-following
- ✅ Prevents duplicate follows
- ✅ Automatic follower/following count updates
- ✅ Fast queries with proper indexes
- ✅ Secure with Row Level Security policies
- ✅ Cascading deletes (if user is deleted, follows are removed)

## Verification

After running the migration, you can verify it worked:

```sql
-- Check if table was created
SELECT table_name FROM information_schema.tables
WHERE table_name = 'follows';

-- Check if columns were added to users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('followers_count', 'following_count');

-- Test the functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN ('get_user_followers', 'get_user_following', 'is_following');
```

## Testing the Follow System

### 1. Follow a User

```sql
-- User A follows User B
INSERT INTO follows (follower_id, following_id)
VALUES (
  'user-a-uuid',  -- Replace with actual UUID
  'user-b-uuid'   -- Replace with actual UUID
);
```

### 2. Check Follower Counts

```sql
-- Check updated counts
SELECT username, followers_count, following_count
FROM users
WHERE id IN ('user-a-uuid', 'user-b-uuid');
```

### 3. Get Followers

```sql
-- Get followers of User B
SELECT * FROM get_user_followers('user-b-uuid', 10, 0);
```

### 4. Unfollow a User

```sql
-- User A unfollows User B
DELETE FROM follows
WHERE follower_id = 'user-a-uuid'
AND following_id = 'user-b-uuid';
```

## Frontend Integration

The follow functionality is already integrated in your app:

- **Sidebar.tsx** - Shows suggested users with follow buttons
- Follow/Unfollow buttons show different states
- Toast notifications for success/error feedback
- Loading states prevent double-clicking

## Security

The migration includes Row Level Security (RLS) policies:

- ✅ Anyone can view follows (public information)
- ✅ Only authenticated users can follow others
- ✅ Users can only follow as themselves (not impersonate)
- ✅ Users can only unfollow their own follows

## Troubleshooting

### Error: "relation 'follows' already exists"

The table already exists. You can either:
- Skip the migration (follow system is already set up)
- Drop the table first: `DROP TABLE follows CASCADE;` then re-run

### Error: "column 'followers_count' already exists"

The columns already exist in the users table. The migration handles this with:
```sql
DO $$ BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE users ADD COLUMN ...
  END IF;
END $$;
```

### Counts are incorrect

Re-initialize the counts:
```sql
UPDATE users
SET followers_count = (
  SELECT COUNT(*) FROM follows WHERE following_id = users.id
),
following_count = (
  SELECT COUNT(*) FROM follows WHERE follower_id = users.id
);
```

## Next Steps

After running the migration:

1. ✅ Deploy your frontend changes
2. ✅ Test follow/unfollow functionality
3. ✅ Check follower counts update correctly
4. ✅ Verify RLS policies are working

## Support

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify you have the correct permissions
3. Make sure the `users` table exists with `id` column as UUID

---

**Created by:** Claude Code
**Date:** 2025-01-01
**Version:** 1.0
