# Sngine to PerkSnow Migration Guide

This guide walks you through migrating users and posts from your Sngine installation to PerkSnow.

## Overview

The migration process will:
- ✅ Transfer all active, non-banned users
- ✅ Transfer all user posts (text, photos, links, etc.)
- ✅ Preserve reaction counts, comments counts, and share counts
- ✅ Handle duplicate usernames/emails automatically
- ✅ Create ID mapping table for future reference
- ⚠️ **Users will need to reset their passwords** (passwords are not migrated for security)

## Prerequisites

1. **Sngine Database Dump**: You already have `webcrqml_fadicaue_social (1).sql`
2. **PostgreSQL Access**: Access to your Supabase/PostgreSQL database
3. **Backup**: Make a backup of your current database before proceeding

## Migration Options

You have two options for running the migration:

### Option A: Import Sngine Tables Directly (Recommended)

This is the simpler approach - import the Sngine tables into the same database.

#### Steps:

1. **Import the Sngine SQL dump into your database**:
   ```bash
   # If using Supabase, go to SQL Editor and paste the dump file contents
   # OR use psql command:
   psql -h your-supabase-host -U postgres -d postgres < "webcrqml_fadicaue_social (1).sql"
   ```

2. **Verify tables were imported**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('users', 'posts', 'posts_photos');
   ```

   ⚠️ **IMPORTANT**: The Sngine database has a `users` table with the same name as your current schema. You'll need to temporarily rename one of them:

   ```sql
   -- Rename Sngine users table temporarily
   ALTER TABLE users RENAME TO sngine_users_temp;
   ALTER TABLE posts RENAME TO sngine_posts_temp;
   ALTER TABLE posts_photos RENAME TO sngine_posts_photos_temp;
   ```

3. **Update the migration script**:

   Open `sngine-migration.sql` and replace all references:
   - Replace `FROM users` with `FROM sngine_users_temp`
   - Replace `FROM posts` with `FROM sngine_posts_temp`
   - Replace `FROM posts_photos` with `FROM sngine_posts_photos_temp`

4. **Run the migration script**:
   ```sql
   -- In Supabase SQL Editor or psql
   \i sngine-migration.sql
   ```

5. **Clean up after successful migration**:
   ```sql
   -- Drop the temporary Sngine tables
   DROP TABLE IF EXISTS sngine_users_temp CASCADE;
   DROP TABLE IF EXISTS sngine_posts_temp CASCADE;
   DROP TABLE IF EXISTS sngine_posts_photos_temp CASCADE;
   DROP TABLE IF EXISTS sngine_id_mappings; -- Optional: Keep for reference
   ```

### Option B: Use Foreign Data Wrapper (Advanced)

If you want to keep databases separate, use postgres_fdw.

#### Steps:

1. **Create a separate database for Sngine data**:
   ```sql
   CREATE DATABASE sngine_temp;
   ```

2. **Import the Sngine dump into that database**:
   ```bash
   psql -h your-host -U postgres -d sngine_temp < "webcrqml_fadicaue_social (1).sql"
   ```

3. **Set up Foreign Data Wrapper** in your main database:
   ```sql
   -- Enable the extension
   CREATE EXTENSION IF NOT EXISTS postgres_fdw;

   -- Create foreign server
   CREATE SERVER sngine_server
   FOREIGN DATA WRAPPER postgres_fdw
   OPTIONS (host 'localhost', dbname 'sngine_temp', port '5432');

   -- Create user mapping
   CREATE USER MAPPING FOR CURRENT_USER
   SERVER sngine_server
   OPTIONS (user 'postgres', password 'your_password');

   -- Import foreign schema
   IMPORT FOREIGN SCHEMA public
   LIMIT TO (users, posts, posts_photos)
   FROM SERVER sngine_server
   INTO public;
   ```

4. **Run the migration script** (no modifications needed):
   ```sql
   \i sngine-migration.sql
   ```

5. **Clean up**:
   ```sql
   DROP SERVER IF EXISTS sngine_server CASCADE;
   DROP DATABASE sngine_temp;
   ```

## What Gets Migrated

### Users

**Migrated Fields**:
- Username (made unique if duplicates exist)
- Email (made unique if duplicates exist)
- Full name (first + last name combined)
- Bio
- Avatar URL
- Cover image URL
- Location
- Website
- Verification status
- Registration date

**Not Migrated**:
- Passwords (users reset via email)
- Social media links
- Privacy settings
- Old notification preferences

**Default Values**:
- `points_balance`: 0
- `followers_count`: 0 (can be calculated later)
- `following_count`: 0 (can be calculated later)

### Posts

**Migrated Fields**:
- Post content (text)
- Image URL (from first photo if photo post)
- Total likes (sum of all reactions)
- Comments count
- Shares count
- Creation date

**Post Types Handled**:
- ✅ Text posts
- ✅ Photo posts
- ✅ Link posts
- ✅ Articles (text content)
- ⚠️ Video posts (only if they have text)
- ❌ Profile pictures (skipped - already in user table)
- ❌ Profile covers (skipped - already in user table)

**Not Migrated**:
- Individual reaction types (combined into likes)
- Privacy settings
- Location data
- Boosted/paid post status

## Monitoring the Migration

The migration script provides real-time feedback:

```
🚀 Starting user migration...
✅ Migrated 100 users...
✅ Migrated 200 users...
✅ User migration complete! Migrated 523 users total.

🚀 Starting posts migration...
✅ Migrated 100 posts...
✅ Migrated 200 posts...
✅ Posts migration complete! Migrated 1,247 posts, skipped 23.

✅ Updated user post counts.

================================================
🎉 MIGRATION COMPLETE!
================================================
Total users in system: 523
Total posts in system: 1,247
Total ID mappings created: 1,770
```

## Handling Conflicts

### Duplicate Usernames
The script automatically appends numbers to duplicate usernames:
- Original: `john`
- Duplicate 1: `john1`
- Duplicate 2: `john2`

### Duplicate Emails
The script uses email aliases:
- Original: `john@example.com`
- Duplicate 1: `john+migrated1@example.com`
- Duplicate 2: `john+migrated2@example.com`

### Missing Users
Posts from users who weren't migrated (banned/inactive) are automatically skipped.

## Post-Migration Tasks

### 1. Password Reset for Migrated Users

Send password reset emails to all migrated users:

```sql
-- Get list of migrated users (those without auth.users entry)
SELECT email, username, full_name
FROM users
WHERE id NOT IN (SELECT id FROM auth.users);
```

You can then:
- Send bulk password reset emails via Supabase Auth
- Or have users use "Forgot Password" flow on login

### 2. Migrate Media Files (Optional)

If Sngine media files are hosted on your server, you may want to migrate them:

1. Download all media from Sngine's upload directory
2. Upload to Supabase Storage or your CDN
3. Update URLs in database:

```sql
-- Update avatar URLs
UPDATE users
SET avatar_url = REPLACE(avatar_url, 'old-domain.com', 'new-domain.com')
WHERE avatar_url LIKE '%old-domain.com%';

-- Update post image URLs
UPDATE posts
SET image_url = REPLACE(image_url, 'old-domain.com', 'new-domain.com')
WHERE image_url LIKE '%old-domain.com%';
```

### 3. Migrate Relationships (Optional)

The current script migrates users and posts. To also migrate followers, likes, and comments, you'll need additional scripts.

**Followers Migration** (if you have a `follows` table):
```sql
-- Example: Migrate follower relationships
INSERT INTO follows (follower_id, following_id, created_at)
SELECT
  m1.new_id as follower_id,
  m2.new_id as following_id,
  NOW()
FROM followings f
JOIN sngine_id_mappings m1 ON m1.entity_type = 'user' AND m1.old_id = f.following_id
JOIN sngine_id_mappings m2 ON m2.entity_type = 'user' AND m2.old_id = f.user_id;

-- Update follower counts
UPDATE users SET followers_count = (
  SELECT COUNT(*) FROM follows WHERE following_id = users.id
);
UPDATE users SET following_count = (
  SELECT COUNT(*) FROM follows WHERE follower_id = users.id
);
```

### 4. Testing

Test the following:
- ✅ Users can log in (after password reset)
- ✅ User profiles display correctly
- ✅ Posts display correctly
- ✅ Images load properly
- ✅ Counts are accurate

### 5. Cleanup

Once everything is confirmed working:

```sql
-- Drop temporary Sngine tables
DROP TABLE IF EXISTS sngine_users_temp CASCADE;
DROP TABLE IF EXISTS sngine_posts_temp CASCADE;
DROP TABLE IF EXISTS sngine_posts_photos_temp CASCADE;

-- Optional: Keep the ID mapping table for reference
-- DROP TABLE IF EXISTS sngine_id_mappings;
```

## Rollback Plan

If something goes wrong:

1. **Restore from backup**:
   ```sql
   -- Your backup restore command here
   ```

2. **Or delete migrated data**:
   ```sql
   -- Delete migrated posts
   DELETE FROM posts WHERE id IN (
     SELECT new_id FROM sngine_id_mappings WHERE entity_type = 'post'
   );

   -- Delete migrated users
   DELETE FROM users WHERE id IN (
     SELECT new_id FROM sngine_id_mappings WHERE entity_type = 'user'
   );

   -- Drop mapping table
   DROP TABLE sngine_id_mappings;
   ```

## Troubleshooting

### Error: "relation 'users' does not exist"
- Make sure you've renamed the Sngine tables as described in Option A
- Or ensure you're using the correct foreign server in Option B

### Error: "duplicate key value violates unique constraint"
- This shouldn't happen with the provided script, but if it does:
- Check if there are existing users with the same usernames/emails
- Manually adjust the `generate_unique_username/email` functions

### Posts not showing images
- Check that `posts_photos` table was imported
- Verify image URLs are accessible
- Consider migrating media files to new storage

### Migration is very slow
- The script processes 100 records at a time
- For large databases (>10k users), consider batching:
  - Run users migration first
  - Wait for completion
  - Then run posts migration

## Support

For issues or questions:
1. Check the migration logs in the SQL output
2. Verify the `sngine_id_mappings` table for successful mappings
3. Review the `SNGINE_MIGRATION_MAPPING.md` for field mappings

---

**Last Updated**: December 2024
