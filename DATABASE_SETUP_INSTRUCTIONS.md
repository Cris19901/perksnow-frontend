# Database Setup Instructions

## Why This Is Needed

Your website is currently showing blank or "mock data" because **the database tables don't exist in Supabase yet**. The application code is correctly configured and trying to fetch data from Supabase, but when the queries return empty results (because the tables don't exist), the UI appears blank or shows placeholder content.

## What Needs To Be Done

You need to run two SQL scripts in your Supabase SQL Editor to create:
1. **Core tables**: users, posts, products
2. **Reels tables**: reels, reel_likes, reel_comments, reel_views

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Sign in to your account
3. Select your project: **kswknblwjlkgxgvypkmo**

### Step 2: Run Core Database Setup

1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New query"** button
3. Open the file `setup-test-data.sql` from your project folder
4. Copy ALL the contents
5. Paste into the SQL Editor
6. Click **"Run"** button (or press Ctrl+Enter)
7. Wait for confirmation message: "Success. No rows returned"

This creates:
- `users` table with profile information
- `posts` table for social media posts
- `products` table for marketplace items
- RLS (Row Level Security) policies for data access
- Trigger to auto-create user profiles when someone signs up

### Step 3: Run Reels Database Setup

1. Still in SQL Editor, click **"New query"** again
2. Open the file `setup-reels-database.sql` from your project folder
3. Copy ALL the contents
4. Paste into the SQL Editor
5. Click **"Run"** button
6. Wait for confirmation message: "Success. No rows returned"

This creates:
- `reels` table for video content
- `reel_likes`, `reel_comments`, `reel_views` tables
- Automatic counter updates (triggers)
- RLS policies for security

### Step 4: Verify Tables Were Created

1. Click on **"Table Editor"** in the left sidebar
2. You should now see these tables:
   - users
   - posts
   - products
   - reels
   - reel_likes
   - reel_comments
   - reel_views

### Step 5: Test Authentication

1. Go to your website: https://beta.perksnow.biz
2. Click **"Sign Up"** or **"Register"**
3. Create a new account with:
   - Email
   - Password
   - Username
4. The trigger will automatically create your user profile

### Step 6: Verify It's Working

After signing up and logging in:

1. **Check Database**: Go back to Supabase → Table Editor → users table
   - You should see your new user record
   - It should have: email, username, avatar_url, etc.

2. **Check Website**: The blank page should now show:
   - Your profile information
   - Empty feed (since no posts exist yet)
   - Working navigation with bottom menu on mobile

3. **Test Creating Content**:
   - Try creating a post
   - Try uploading a Reel (video)
   - These should now save to the database

## Troubleshooting

### If you see "permission denied" errors:

Run this in SQL Editor:
```sql
-- Grant permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON products TO authenticated;
GRANT ALL ON reels TO authenticated;
GRANT ALL ON reel_likes TO authenticated;
GRANT ALL ON reel_comments TO authenticated;
GRANT ALL ON reel_views TO authenticated;
```

### If you see "relation already exists" errors:

This means some tables already exist. You can either:
1. Drop the existing tables and re-run (data will be lost)
2. Or just skip those specific CREATE TABLE statements

### If website is still blank after setup:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any red error messages
4. Check Network tab - look for failed requests
5. Share any errors you see

## What Happens Next

Once the database is set up:
- ✅ Authentication will work properly
- ✅ Users can sign up and create profiles
- ✅ Posts and products can be created and viewed
- ✅ Reels (videos) can be uploaded and watched
- ✅ Mobile bottom navigation will show up
- ✅ Real data instead of blank/placeholder content

## Environment Variables Already Configured

These are already set up in Vercel (verified):
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ✅ VITE_R2_ACCOUNT_ID
- ✅ VITE_R2_ACCESS_KEY_ID
- ✅ VITE_R2_SECRET_ACCESS_KEY
- ✅ VITE_R2_BUCKET_NAME

## Summary

The issue is NOT with:
- ❌ Environment variables (already configured)
- ❌ Application code (working correctly)
- ❌ Deployment (successful)

The issue IS with:
- ✅ **Missing database tables** (need to run SQL scripts)

After running the two SQL scripts, everything should work!
