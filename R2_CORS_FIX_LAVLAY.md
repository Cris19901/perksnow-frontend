# Fix R2 CORS Error for LavLay

## Quick Fix (2 Minutes)

### Step 1: Update R2 CORS Configuration

1. **Go to Cloudflare Dashboard**:
   - Visit https://dash.cloudflare.com
   - Click **R2** in the left sidebar

2. **Select Your Bucket**:
   - Click on your bucket (probably `perksnow-media-dev` or `lavlay-media-dev`)

3. **Edit CORS Settings**:
   - Click **Settings** tab
   - Scroll to **CORS Policy**
   - Click **Edit** or **Add CORS policy**

4. **Paste This Configuration**:

```json
[
  {
    "AllowedOrigins": [
      "https://lavlay.com",
      "https://www.lavlay.com",
      "https://*.vercel.app",
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
      "ETag",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

**What this does**:
- ✅ Allows uploads from `lavlay.com` and `www.lavlay.com`
- ✅ Allows uploads from all Vercel preview deployments (`*.vercel.app`)
- ✅ Allows local development (`localhost:5173`)

5. **Click Save**

6. **Wait 30 seconds** for changes to propagate

### Step 2: Update Bucket Name (Optional but Recommended)

Since you've rebranded to LavLay, consider renaming your R2 bucket:

**Option A: Create New Bucket**
1. In Cloudflare R2, click **Create bucket**
2. Name it: `lavlay-media`
3. Copy the CORS configuration above
4. Update your environment variables:
   ```
   VITE_R2_BUCKET_NAME=lavlay-media
   ```

**Option B: Keep Existing Bucket**
- Just update the CORS (Step 1)
- Your bucket name doesn't have to match the project name

### Step 3: Test Upload

1. Go to your site: https://lavlay.com or https://www.lavlay.com
2. Press `Ctrl+Shift+R` (hard refresh)
3. Try uploading an image or reel
4. Should work now! ✅

---

## Troubleshooting

### Error Still Appears?

**Check browser console** (F12):
- Look for the exact origin being blocked
- Make sure it matches one in your `AllowedOrigins` list

**Verify CORS is saved**:
1. Go back to R2 bucket settings
2. Check that CORS policy shows your configuration
3. Sometimes you need to click "Edit" then "Save" again

**Clear browser cache**:
```bash
# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### If Using Vercel Preview Deployments

Your preview URLs look like: `your-project-abc123.vercel.app`

The wildcard `*.vercel.app` covers all of them. If it doesn't work:

1. Get the exact preview URL from Vercel
2. Add it specifically to AllowedOrigins:
   ```json
   "AllowedOrigins": [
     "https://lavlay.com",
     "https://your-project-abc123.vercel.app"
   ]
   ```

---

## Current vs Updated Configuration

### ❌ Old (PerkSnow)
```json
"AllowedOrigins": [
  "https://beta.perksnow.biz"
]
```

### ✅ New (LavLay)
```json
"AllowedOrigins": [
  "https://lavlay.com",
  "https://www.lavlay.com",
  "https://*.vercel.app"
]
```

---

## Security Note

This CORS configuration is secure because:
- ✅ Only your specific domains can upload
- ✅ Wildcards are limited to Vercel subdomains
- ✅ Local development only works on your machine
- ❌ Random websites cannot upload to your bucket

---

**Last Updated**: December 31, 2024
**Project**: LavLay
