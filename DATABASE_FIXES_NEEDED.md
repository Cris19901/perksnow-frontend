# Database Fixes Needed

## 🔴 CRITICAL & URGENT: Post Creation Blocked by Database Trigger

**Status**: 🚨 **BLOCKING** - Users cannot create posts until this is fixed!

**Error in Console**:
```
❌ CreatePost: Error creating post:
{code: '42703', message: 'column "transaction_type" of relation "points_transactions" does not exist'}
```

**What's Happening**:
When a user creates a post, a database trigger tries to award points but fails because the `points_transactions` table is missing the `transaction_type` column.

**Root Cause**:
You have a database trigger (probably called something like `award_points_for_post` or similar) that fires when a post is inserted. This trigger references a column `transaction_type` that doesn't exist in your `points_transactions` table.

**🚨 RECOMMENDED: Use Option 2 (Disable Trigger) - see below**

The trigger is referencing many columns that don't exist. Unless you want to keep adding columns, it's easier to just disable it temporarily.

---

**How to Fix** (Choose ONE option):

### Option 1: Add Missing Columns (Keep trying if you want the trigger to work)

**This will fix the issue in 30 seconds:**

1. Open Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add ALL missing columns to points_transactions table
ALTER TABLE points_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS activity TEXT;

-- Set default values for any existing rows
UPDATE points_transactions
SET
  transaction_type = COALESCE(transaction_type, 'earn'),
  source = COALESCE(source, 'system'),
  description = COALESCE(description, 'Points transaction'),
  activity = COALESCE(activity, 'post_created');

-- If activity column has NOT NULL constraint, set a default
ALTER TABLE points_transactions
ALTER COLUMN activity SET DEFAULT 'post_created';

-- Verify all columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'points_transactions'
ORDER BY ordinal_position;
```

**⚠️ If you still get errors about missing columns:**

The trigger might reference even more columns. To find out what columns it needs, run this query to see the trigger function:

```sql
-- Find the trigger function code
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%point%';
```

Look at the function code and find all column names in the INSERT INTO statement.

5. Click **RUN** (or press Ctrl+Enter)
6. You should see success message and the list of columns
7. **Hard refresh your app**: Ctrl+Shift+R
8. Try creating a post again - it should work now!

---

### Option 2: QUICK FIX - Disable the Trigger Temporarily

**If you keep getting column errors, just disable the trigger for now:**

This will let users create posts immediately, but they won't earn points until you fix the trigger properly.

```sql
-- Find and disable ALL triggers on posts table
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'posts'
  LOOP
    EXECUTE format('ALTER TABLE posts DISABLE TRIGGER %I', trigger_record.trigger_name);
    RAISE NOTICE 'Disabled trigger: %', trigger_record.trigger_name;
  END LOOP;
END $$;
```

**To re-enable triggers later:**

```sql
-- Re-enable all triggers on posts table
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'posts'
  LOOP
    EXECUTE format('ALTER TABLE posts ENABLE TRIGGER %I', trigger_record.trigger_name);
    RAISE NOTICE 'Enabled trigger: %', trigger_record.trigger_name;
  END LOOP;
END $$;
```

---

### Option 3: Find and Fix the Trigger/Function

**If you want to understand what the trigger does before fixing:**

```sql
-- Find all triggers on posts table
SELECT
  trigger_name,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'posts';

-- View the function that the trigger calls
-- Look for function names in the action_statement above
-- Then view that function in Database → Functions
```

Once you find the trigger function, you'll need to update it to either:
- Add the `transaction_type` column to the INSERT statement, OR
- Remove the `transaction_type` reference if it's not needed

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
