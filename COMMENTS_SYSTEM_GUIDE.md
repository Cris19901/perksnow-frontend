# Comments System Setup Guide

This guide explains how to set up the comments system for posts in your LavLay application.

## What This Migration Does

The `CREATE_COMMENTS_SYSTEM.sql` migration file creates:

1. **`post_comments` table** - Stores comments with support for nested replies
2. **Indexes** - For fast lookups and queries
3. **Comments count column** - Adds/updates column in posts table
4. **Automatic count updates** - Triggers that keep comment counts in sync
5. **Helper functions** - To fetch comments, replies, and counts
6. **Security policies** - Row Level Security (RLS) for data protection
7. **Update tracking** - Automatic updated_at timestamp on edits

## How to Run the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `CREATE_COMMENTS_SYSTEM.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" message

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push --file CREATE_COMMENTS_SYSTEM.sql
```

### Option 3: Using psql (Direct Database Connection)

```bash
# Connect to your database
psql "postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# Run the migration
\i CREATE_COMMENTS_SYSTEM.sql
```

## What Gets Created

### Tables

#### `post_comments` table
```sql
- id (UUID, Primary Key)
- post_id (UUID) - Reference to posts table
- user_id (UUID) - User who wrote the comment
- parent_comment_id (UUID, nullable) - NULL for top-level comments, references another comment for replies
- content (TEXT) - Comment text (1-2000 characters)
- created_at (Timestamp)
- updated_at (Timestamp)
```

#### Table Updates
```sql
posts.comments_count (Integer) - Number of top-level comments on post
```

### Functions

1. **`get_post_comments(post_id, limit, offset)`**
   - Returns top-level comments for a post with user info and reply counts
   - Example: `SELECT * FROM get_post_comments('post-uuid', 20, 0)`
   - Returns: comment details, user info, and count of replies

2. **`get_comment_replies(comment_id, limit, offset)`**
   - Returns replies to a specific comment
   - Example: `SELECT * FROM get_comment_replies('comment-uuid', 10, 0)`
   - Returns: reply details with user info

3. **`count_total_post_comments(post_id)`**
   - Returns total count of all comments including replies
   - Example: `SELECT count_total_post_comments('post-uuid')`
   - Returns: integer count

### Features

- ✅ Nested comment support (replies to comments)
- ✅ Automatic comment count updates for posts
- ✅ Comment editing with automatic updated_at tracking
- ✅ Fast queries with proper indexes
- ✅ Secure with Row Level Security policies
- ✅ Cascading deletes (if post or user is deleted, comments are removed)
- ✅ Character limit validation (1-2000 characters)
- ✅ Reply count for each comment

## Verification

After running the migration, you can verify it worked:

```sql
-- Check if table was created
SELECT table_name FROM information_schema.tables
WHERE table_name = 'post_comments';

-- Check if column was added to posts table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'posts'
AND column_name = 'comments_count';

-- Test the functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_post_comments',
  'get_comment_replies',
  'count_total_post_comments'
);
```

## Testing the Comments System

### 1. Add a Comment to a Post

```sql
-- User adds a comment
INSERT INTO post_comments (user_id, post_id, content)
VALUES (
  'user-uuid',  -- Replace with actual UUID
  'post-uuid',  -- Replace with actual UUID
  'This is a great post!'
);
```

### 2. Check Comment Count

```sql
-- Check updated count
SELECT id, content, comments_count
FROM posts
WHERE id = 'post-uuid';
```

### 3. Add a Reply to a Comment

```sql
-- User replies to a comment
INSERT INTO post_comments (user_id, post_id, parent_comment_id, content)
VALUES (
  'user-uuid',          -- Replace with actual UUID
  'post-uuid',          -- Replace with actual UUID
  'comment-uuid',       -- Replace with parent comment UUID
  'Thanks for sharing!'
);
```

### 4. Get Comments with Replies

```sql
-- Get top-level comments with reply counts
SELECT * FROM get_post_comments('post-uuid', 20, 0);

-- Get replies for a specific comment
SELECT * FROM get_comment_replies('comment-uuid', 10, 0);

-- Get total comment count (including replies)
SELECT count_total_post_comments('post-uuid');
```

### 5. Update a Comment

```sql
-- User edits their comment
UPDATE post_comments
SET content = 'Updated comment text'
WHERE id = 'comment-uuid'
AND user_id = 'user-uuid';  -- RLS ensures only owner can update
```

### 6. Delete a Comment

```sql
-- User deletes their comment
DELETE FROM post_comments
WHERE id = 'comment-uuid'
AND user_id = 'user-uuid';  -- RLS ensures only owner can delete
```

## Frontend Integration

The comment functionality will be integrated into:

- **PostComments.tsx** - New component for displaying and managing comments
  - List of comments with user info
  - Reply functionality
  - Edit/delete own comments
  - Load more comments pagination
  - Real-time comment submission

- **Post.tsx** - Updated to show comments modal/drawer
  - Comment count display
  - Click to view comments
  - Add comment input

Each component will have:
- Comment list with nested replies
- Avatar and username display
- Timestamps (e.g., "2 hours ago")
- Reply button
- Edit/delete for own comments
- Loading states
- Toast notifications for feedback

## Comment Display Format

Comments will be displayed as:

```
┌─────────────────────────────────────────┐
│ 👤 John Doe  @johndoe   2 hours ago    │
│ This is a great post!                  │
│ [Reply] [Edit] [Delete]                │
│                                         │
│   └─ 👤 Jane Smith  @janesmith  1h ago │
│      Thanks for sharing!               │
│      [Reply] [Edit] [Delete]           │
└─────────────────────────────────────────┘
```

## Security

The migration includes Row Level Security (RLS) policies:

- ✅ Anyone can view comments (public information)
- ✅ Only authenticated users can add comments
- ✅ Users can only edit their own comments
- ✅ Users can only delete their own comments
- ✅ Comment content is validated (1-2000 characters)

## Performance Considerations

- Indexes are created for fast comment lookups
- Top-level comments are loaded first (paginated)
- Replies are loaded separately when needed
- Comment counts are cached and auto-updated via triggers

## Troubleshooting

### Error: "relation 'post_comments' already exists"

The table already exists. You can either:
- Skip the migration (comments system is already set up)
- Drop the table first: `DROP TABLE post_comments CASCADE;` then re-run

### Error: "column 'comments_count' already exists"

The column already exists. The migration handles this with:
```sql
DO $$ BEGIN
  IF NOT EXISTS (...) THEN
    ALTER TABLE posts ADD COLUMN ...
  END IF;
END $$;
```

### Comment counts are incorrect

Re-initialize the counts:
```sql
UPDATE posts
SET comments_count = (
  SELECT COUNT(*)
  FROM post_comments
  WHERE post_comments.post_id = posts.id
  AND post_comments.parent_comment_id IS NULL
);
```

### Comments not showing up

Check RLS policies:
```sql
-- Verify policies are enabled
SELECT tablename, policyname
FROM pg_policies
WHERE tablename = 'post_comments';
```

## Next Steps

After running the migration:

1. ✅ Create PostComments component
2. ✅ Update Post component to show comments
3. ✅ Test comment creation, editing, deletion
4. ✅ Test reply functionality
5. ✅ Verify RLS policies are working

## Support

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify you have the correct permissions
3. Make sure the `posts` table exists with `id` column as UUID
4. Ensure the `users` table exists with `id` column as UUID

---

**Created by:** Claude Code
**Date:** 2025-01-01
**Version:** 1.0
