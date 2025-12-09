# Database Fixes Needed

## 🔴 CRITICAL: points_transactions Schema Error

**Error in Console**:
```
column "transaction_type" of relation "points_transactions" does not exist
```

**Root Cause**:
This error is coming from a Supabase database trigger or stored procedure (not frontend code). The `points_transactions` table is being accessed somewhere with a column name that doesn't exist.

**How to Fix**:

### Option 1: Add Missing Column (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Run this SQL to add the missing column:

```sql
-- Add transaction_type column to points_transactions table
ALTER TABLE points_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT;

-- Optionally add a constraint to limit values
ALTER TABLE points_transactions
ADD CONSTRAINT transaction_type_check
CHECK (transaction_type IN ('earn', 'spend', 'bonus', 'refund', 'adjustment'));
```

### Option 2: Find and Fix the Database Function
1. Go to Supabase Dashboard → Database → Functions
2. Look for any function that references `points_transactions`
3. Update the function to use the correct column name

**Common places this error occurs**:
- Triggers on user signup (giving welcome points)
- Triggers on post creation (earning points for activity)
- Triggers on product purchase (spending/earning points)

---

## ✅ FIXED: Post Creation video_url Error

**Status**: Already fixed in latest deployment

**What was wrong**:
- CreatePost component tried to insert both `image_url` AND `video_url` columns
- Database only has `image_url` column

**Solution Applied**:
- Now using `image_url` for both images and videos
- The `image_url` field can store any media URL (image or video)

---

## 📋 How to Check Your Database Schema

### Check points_transactions table:
```sql
-- See all columns in points_transactions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'points_transactions'
ORDER BY ordinal_position;
```

### Check posts table:
```sql
-- See all columns in posts
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;
```

---

## 🔍 Finding Database Triggers

If you want to find which trigger is causing the points_transactions error:

```sql
-- List all triggers in your database
SELECT
  trigger_name,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

---

## 💡 Testing After Fixes

After applying the database fixes:

1. **Hard refresh** the app: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Open Console**: Press F12 → Console tab
3. **Test creating a post**: Upload an image or video and post
4. **Check for errors**: Look for any ❌ red error messages
5. **Test points system**: Check if points balance updates correctly

---

## 🆘 If Errors Persist

1. **Export your error logs**:
   - Press F12 → Console
   - Right-click in console → Save as...
   - Share the log file

2. **Check Supabase logs**:
   - Go to Supabase Dashboard → Logs
   - Look for failed queries or errors
   - Check timestamps matching when error occurred

3. **Verify table structure**:
   - Run the SQL queries above to check your schema
   - Compare with expected structure
