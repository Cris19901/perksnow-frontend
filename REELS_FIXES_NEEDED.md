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

## 🔴 Issue 2: R2 CORS Upload Error (CRITICAL)

**Error**:
```
Access to fetch at 'https://socialhub-uploads...r2.cloudflarestorage.com/...' from origin 'https://beta.perksnow.biz' has been blocked by CORS policy
```

**Problem**: Your Cloudflare R2 bucket doesn't have CORS configured to allow uploads from your website.

### ✅ How to Fix (2 Minutes)

**Full instructions in**: [R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md)

**Quick steps**:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** → Your bucket (`socialhub-uploads`)
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

**Fix Both Issues To Enable Reels:**

1. ✅ **Fix Database Function** → Run [FIX_GET_REELS_FEED.sql](FIX_GET_REELS_FEED.sql) in Supabase SQL Editor
2. ✅ **Configure R2 CORS** → Follow [R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md) in Cloudflare Dashboard

**After fixing both**:
- Reels page will load properly (no more "reel_id is ambiguous" error)
- Reel uploads will work (no more CORS errors)
- Users can earn 50 points per reel upload! 🎥

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
