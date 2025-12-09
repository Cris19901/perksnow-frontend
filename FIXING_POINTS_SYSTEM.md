# Fixing the Points System

## Current Status ✅
- **Posts are working**: Users can create posts successfully
- **Trigger is disabled**: Points are NOT being awarded (trigger was disabled to unblock post creation)
- **Next step**: Fix the trigger properly and re-enable it

---

## Step 1: Investigate the Current Trigger Function

First, let's see what the trigger is trying to do. Run this in Supabase SQL Editor:

```sql
-- Find all triggers on the posts table
SELECT
  trigger_name,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'posts'
ORDER BY trigger_name;
```

This will show you the trigger name(s). You'll see something like:
- `award_points_for_post_trigger`
- `handle_new_post_trigger`
- Or similar

---

## Step 2: View the Trigger Function Code

Once you know the trigger name, find the function it calls:

```sql
-- Find and view all point-related functions
SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%point%'
    OR p.proname LIKE '%post%'
    OR p.proname LIKE '%award%'
  )
ORDER BY p.proname;
```

**What to look for**:
- The INSERT statement that's failing
- What columns it's trying to insert into `points_transactions`
- What values it's using

---

## Step 3: Check Your Current Table Schema

Let's see what columns you actually have:

```sql
-- Check points_transactions table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'points_transactions'
ORDER BY ordinal_position;
```

---

## Step 4: Choose Your Fix Approach

Based on what you find, choose ONE of these options:

### Option A: Simplify the Trigger (RECOMMENDED)

If the trigger is overly complex or references many columns you don't need, create a NEW simpler trigger:

```sql
-- Drop the old trigger and function
DROP TRIGGER IF EXISTS [old_trigger_name] ON posts;
DROP FUNCTION IF EXISTS [old_function_name]();

-- Create a simple trigger function that matches your schema
CREATE OR REPLACE FUNCTION award_points_for_new_post()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 10 points for creating a post
  INSERT INTO points_transactions (user_id, points, created_at)
  VALUES (NEW.user_id, 10, NOW());

  -- Update user's points balance
  UPDATE users
  SET points_balance = points_balance + 10
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER award_points_for_post_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION award_points_for_new_post();
```

**Adjust the columns** in the INSERT statement to match what you found in Step 3!

---

### Option B: Add All Required Columns

If you want to keep the original trigger with all its features, add all missing columns:

```sql
-- Add ALL columns that the trigger needs
ALTER TABLE points_transactions
ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'earn',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'post',
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT 'Points earned',
ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT 'post_created',
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Set default values for any existing rows
UPDATE points_transactions
SET
  transaction_type = COALESCE(transaction_type, 'earn'),
  source = COALESCE(source, 'post'),
  description = COALESCE(description, 'Points earned'),
  activity = COALESCE(activity, 'post_created');

-- Add NOT NULL constraints if needed (only if the trigger requires it)
-- ALTER TABLE points_transactions ALTER COLUMN activity SET NOT NULL;
```

Then modify the trigger function to use these columns properly.

---

### Option C: Fix the Existing Trigger Function

If you found the trigger function code in Step 2, you can edit it directly:

```sql
-- Replace [function_name] with the actual name you found
CREATE OR REPLACE FUNCTION [function_name]()
RETURNS TRIGGER AS $$
BEGIN
  -- Modify this INSERT to only use columns that exist in your table
  INSERT INTO points_transactions (
    user_id,
    points,
    created_at
    -- Remove any columns that don't exist in your table!
  )
  VALUES (
    NEW.user_id,
    10,  -- points to award
    NOW()
  );

  -- Update user's balance
  UPDATE users
  SET points_balance = points_balance + 10
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Step 5: Re-enable the Trigger

Once you've fixed the function, re-enable the trigger:

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

## Step 6: Test It

1. **Check Console**: Press F12 and go to Console tab
2. **Create a test post**: Upload an image and write some text
3. **Watch for errors**: Look for any ❌ error messages in console
4. **Check your points**: Go to the Points page - you should see +10 points

**Verify in database**:
```sql
-- Check if points were recorded
SELECT * FROM points_transactions
ORDER BY created_at DESC
LIMIT 5;

-- Check user's balance
SELECT id, email, points_balance
FROM users
WHERE id = '[your-user-id]';
```

---

## Quick Example: Minimal Working Trigger

If you just want something simple that works:

```sql
-- This is the SIMPLEST possible trigger
-- Adjust columns to match YOUR points_transactions table!

CREATE OR REPLACE FUNCTION simple_post_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert transaction (adjust columns to match your table!)
  INSERT INTO points_transactions (user_id, points)
  VALUES (NEW.user_id, 10);

  -- Update balance
  UPDATE users SET points_balance = points_balance + 10
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop old one first if exists)
DROP TRIGGER IF EXISTS award_points_for_post_trigger ON posts;
CREATE TRIGGER award_points_for_post_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION simple_post_points();
```

---

## Common Columns in points_transactions

Your table might have some of these:

**Required/Common**:
- `id` (auto-generated)
- `user_id` (who earned/spent points)
- `points` (amount, positive or negative)
- `created_at` (timestamp)

**Optional but useful**:
- `transaction_type` ('earn' or 'spend')
- `source` ('post', 'comment', 'like', 'purchase')
- `description` (human-readable message)
- `activity` (specific action like 'post_created')
- `reference_id` (UUID linking to the post/comment/etc)
- `metadata` (JSONB for extra data)

Only include columns that exist in YOUR table!

---

## Need Help?

If you're stuck:

1. Run Step 1 and Step 3 queries
2. Share the results with me
3. I'll write the exact SQL you need for your specific schema
