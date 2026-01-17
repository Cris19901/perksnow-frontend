# 🚨 Critical Production Fixes

**Priority**: URGENT
**Issues Found**: 4

---

## 🔴 ISSUE 1: Feed Not Loading - CRITICAL

### Error Message:
```
Error: permission denied for table post_images
```

### Fix: Run This SQL in Supabase NOW

**Go to**: https://supabase.com/dashboard → Your Project → SQL Editor

**Paste and Run:**

```sql
-- Fix post_images RLS permission error
DROP POLICY IF EXISTS "Public can view all post images" ON post_images;
DROP POLICY IF EXISTS "Anyone can view post images" ON post_images;
DROP POLICY IF EXISTS "Users can insert images for their own posts" ON post_images;
DROP POLICY IF EXISTS "Users can update images on their own posts" ON post_images;
DROP POLICY IF EXISTS "Users can delete images from their own posts" ON post_images;

-- Allow everyone to view post images
CREATE POLICY "Public can view all post images"
  ON post_images FOR SELECT
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Users can insert images for their own posts"
  ON post_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

-- Allow users to update their images
CREATE POLICY "Users can update images on their own posts"
  ON post_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

-- Allow users to delete their images
CREATE POLICY "Users can delete images from their own posts"
  ON post_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_id AND posts.user_id = auth.uid()
    )
  );

ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
```

**After running**, refresh https://lavlay.com and feed should load!

---

## 🟡 ISSUE 2: Usernames Not Clickable in Suggestions

I'll fix this in the code after you run the SQL fix.

## 🟡 ISSUE 3: Mobile Points Icon Visibility

I'll fix this in the code after you run the SQL fix.

## 🟢 ISSUE 4: Additional Points Features

I'll implement comment and reel view points after critical fixes.

---

## ⚡ ACTION REQUIRED NOW

1. Run the SQL fix above in Supabase
2. Tell me when done
3. Check if feed loads
4. I'll then fix the other 3 issues in code
