# Reels Page Fixes Needed

## 🔴 Issue 1: Database Function Error (CRITICAL)

**Error**:
```
Error fetching reels: column reference "reel_id" is ambiguous
```

**Problem**: The `get_reels_feed()` function has an ambiguous column reference. This happens when a column name exists in multiple tables and isn't properly qualified with the table name.

### ✅ How to Fix (1 Minute)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents** of **[FIX_GET_REELS_FEED.sql](FIX_GET_REELS_FEED.sql)**
3. **Paste and Run** (Ctrl+Enter)
4. You should see: `Function created successfully`
5. **Hard refresh your app**: Ctrl+Shift+R
6. Go to the Reels page - it should load now!

---

## 🔴 Issue 2: Database Permissions Error (CRITICAL)

**Error**:
```
permission denied for table reels
```

**Problem**: The authenticated users don't have proper permissions to insert/query the `reels` table. This is a Row Level Security (RLS) issue.

### ✅ How to Fix (1 Minute)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents** of **[FIX_REELS_PERMISSIONS.sql](FIX_REELS_PERMISSIONS.sql)**
3. **Paste and Run** (Ctrl+Enter)
4. You should see: Permissions granted successfully
5. **Hard refresh your app**: Ctrl+Shift+R
6. Try uploading a reel - permissions should work now!

---

## 🔴 Issue 3: Points Permissions Error (CRITICAL)

**Error**:
```
permission denied for table points_transactions
```

**Problem**: When a reel is uploaded successfully, the system tries to award 50 points by inserting into the `points_transactions` table, but authenticated users don't have permission. This is another Row Level Security (RLS) issue.

### ✅ How to Fix (1 Minute)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents** of **[FIX_POINTS_PERMISSIONS.sql](FIX_POINTS_PERMISSIONS.sql)**
3. **Paste and Run** (Ctrl+Enter)
4. You should see: Permissions granted successfully
5. **Hard refresh your app**: Ctrl+Shift+R
6. Try uploading a reel - you should earn 50 points now!

---

## 🔴 Issue 4: Reels Trigger Missing Activity Column (CRITICAL)

**Error**:
```
null value in column "activity" of relation "points_transactions" violates not-null constraint
```

**Problem**: The database trigger `award_points_for_reel_upload()` is trying to insert into `points_transactions` but isn't including the required `activity` column. Also, it's using the wrong value for `transaction_type` ('earned' instead of 'earn').

### ✅ How to Fix (1 Minute)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy the entire contents** of **[FIX_REELS_TRIGGERS.sql](FIX_REELS_TRIGGERS.sql)**
3. **Paste and Run** (Ctrl+Enter)
4. You should see: Triggers updated successfully
5. **Hard refresh your app**: Ctrl+Shift+R
6. Try uploading a reel - points should be awarded now!

---

## 🔴 Issue 5: R2 CORS Upload Error (CRITICAL)

**Error**:
```
Access to fetch at 'https://perksnow-media-dev.r2.cloudflarestorage.com/...' from origin 'https://beta.perksnow.biz' has been blocked by CORS policy
```

**Problem**: Your Cloudflare R2 bucket doesn't have CORS configured to allow uploads from your website.

### ✅ How to Fix (2 Minutes)

**Full instructions in**: [R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md)

**Quick steps**:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** → Your bucket (`perksnow-media-dev`)
3. Click **Settings** tab
4. Scroll to **CORS Policy** section
5. Click **Add CORS policy**
6. Paste this JSON:

```json
[
  {
    "AllowedOrigins": [
      "https://beta.perksnow.biz",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

7. Click **Save**
8. **Hard refresh your site**: Ctrl+Shift+R
9. Try uploading a reel - it should work!

---

## 📊 Summary

**Fix All Issues To Enable Reels:**

### Database Fixes (Supabase):
1. ✅ **Fix Database Function** → Run [FIX_GET_REELS_FEED.sql](FIX_GET_REELS_FEED.sql) in Supabase SQL Editor
2. ✅ **Fix Reels Permissions** → Run [FIX_REELS_PERMISSIONS.sql](FIX_REELS_PERMISSIONS.sql) in Supabase SQL Editor
3. ✅ **Fix Points Permissions** → Run [FIX_POINTS_PERMISSIONS.sql](FIX_POINTS_PERMISSIONS.sql) in Supabase SQL Editor
4. ✅ **Fix Reels Triggers** → Run [FIX_REELS_TRIGGERS.sql](FIX_REELS_TRIGGERS.sql) in Supabase SQL Editor

### Storage & Deployment Fixes:
5. ✅ **Configure R2 CORS** → Follow [R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md) in Cloudflare Dashboard
6. ✅ **Update Vercel R2 Credentials** → Follow [FIX_R2_BUCKET_NAME.md](FIX_R2_BUCKET_NAME.md) to set correct bucket name

**After fixing all**:
- ✅ Reels page will load properly (no more "reel_id is ambiguous" error)
- ✅ Reels can be uploaded (no more "permission denied for table reels" error)
- ✅ Points will be awarded (no more "permission denied for table points_transactions" error)
- ✅ R2 uploads will work (no more CORS errors)
- ✅ Users can earn 50 points per reel upload! 🎥

---

## 🆘 If You Get Stuck

### Database Fix Not Working?

**Check if function exists**:
```sql
SELECT proname FROM pg_proc
WHERE proname = 'get_reels_feed';
```

If it says "no rows", the function wasn't created. Make sure you:
- Copied the ENTIRE contents of FIX_GET_REELS_FEED.sql
- Clicked RUN in Supabase SQL Editor
- There were no error messages

### Permissions Still Denied?

**Check if RLS policies exist**:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reels';
```

If no policies show up, run [FIX_REELS_PERMISSIONS.sql](FIX_REELS_PERMISSIONS.sql) again.

**Check if RLS is enabled**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'reels';
```

The `rowsecurity` column should be `true`.

### Points Not Being Awarded?

**Error**: `permission denied for table points_transactions`

**Check if RLS policies exist for points_transactions**:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'points_transactions';
```

If no policies show up, run [FIX_POINTS_PERMISSIONS.sql](FIX_POINTS_PERMISSIONS.sql).

**Check if users table allows updates to points_balance**:
```sql
SELECT grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'points_balance';
```

### CORS Fix Not Working?

1. **Double-check the domain** matches exactly: `https://beta.perksnow.biz`
2. **Wait 5 minutes** for CORS changes to propagate
3. **Hard refresh** with Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. **Clear browser cache**: Chrome → Settings → Privacy → Clear browsing data

---

## ✨ Testing After Fixes

1. Go to Reels page - should load without errors
2. Click **"Upload Reel"** button
3. Select a video (max 100MB, 3-180 seconds)
4. Add a caption
5. Click **"Upload Reel & Earn 50 Points"**
6. Upload should complete successfully! 🎉
7. Check your points balance - you should see +50 points
