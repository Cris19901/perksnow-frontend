# Fix R2 Bucket Name Configuration

## 🚨 Issue

Your code is trying to upload to a bucket named `socialhub-uploads` but your actual bucket is `perksnow-media-dev`. This causes CORS errors and upload failures.

```
Access to fetch at 'https://socialhub-uploads.7fc60b39d74e624471954b8c1b1ea3cd.r2.cloudflarestorage.com/...'
```

---

## ✅ What I've Already Fixed

I've updated the following files to use the correct bucket name `perksnow-media-dev`:

1. **[src/lib/r2-client.ts](src/lib/r2-client.ts:12)** - Changed default bucket name
2. **[.env](.env:10)** - Added R2 configuration with correct bucket name
3. **[R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md)** - Updated documentation
4. **[REELS_FIXES_NEEDED.md](REELS_FIXES_NEEDED.md)** - Updated documentation

---

## 🔧 What You Need To Do

### Step 1: Update Your Local .env File

Open your [.env](.env) file and fill in your actual R2 credentials:

```bash
# Cloudflare R2 Storage Configuration
VITE_R2_ACCOUNT_ID=7fc60b39d74e624471954b8c1b1ea3cd  # Replace with your actual account ID
VITE_R2_ACCESS_KEY_ID=your_actual_access_key_here
VITE_R2_SECRET_ACCESS_KEY=your_actual_secret_key_here
VITE_R2_BUCKET_NAME=perksnow-media-dev
VITE_R2_PUBLIC_URL=https://perksnow-media-dev.your-account.r2.dev
```

**Where to get these values:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **R2** in left sidebar
3. Click **Manage R2 API Tokens**
4. Create a new token with **"Object Read & Write"** permissions
5. Copy the Access Key ID and Secret Access Key
6. Your Account ID is visible in the R2 dashboard URL

### Step 2: Update Vercel Environment Variables

Since your site is deployed on Vercel, you need to update the environment variables there too:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project: **perknowv2-latest**
3. Go to **Settings** → **Environment Variables**
4. Add/Update these variables:

```
VITE_R2_ACCOUNT_ID = 7fc60b39d74e624471954b8c1b1ea3cd
VITE_R2_ACCESS_KEY_ID = your_access_key_here
VITE_R2_SECRET_ACCESS_KEY = your_secret_key_here
VITE_R2_BUCKET_NAME = perksnow-media-dev
VITE_R2_PUBLIC_URL = https://perksnow-media-dev.your-account.r2.dev
```

5. **Important**: Set these for **Production**, **Preview**, and **Development** environments
6. Click **Save**

### Step 3: Redeploy Your Site

After updating Vercel environment variables:

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**

**OR** just push a new commit to trigger a deployment:

```bash
git add .
git commit -m "Fix R2 bucket configuration"
git push
```

### Step 4: Test Locally

Before the Vercel deployment completes, test locally:

```bash
# Stop your dev server (Ctrl+C)
npm run dev
```

Try uploading a reel - it should now work!

---

## 🔐 Configure R2 CORS (Still Required!)

Even with the correct bucket name, you STILL need to configure CORS on your R2 bucket:

**Follow the complete guide**: [R2_CORS_CONFIGURATION.md](R2_CORS_CONFIGURATION.md)

**Quick steps**:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2
2. Click on `perksnow-media-dev` bucket
3. Settings → CORS Policy → Add CORS policy
4. Paste the CORS JSON from the guide
5. Save

---

## ✅ How to Verify It's Fixed

After completing all steps:

1. **Local**: Try uploading a reel at http://localhost:5173
2. **Production**: Try uploading at https://beta.perksnow.biz

You should see the upload URL change from:
```
❌ https://socialhub-uploads.7fc60b39...
```

To:
```
✅ https://perksnow-media-dev.7fc60b39...
```

---

## 🆘 Troubleshooting

### Still seeing `socialhub-uploads` in console?

**Solution**: Hard refresh your browser:
- Windows/Linux: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

Or clear your browser cache completely.

### Getting "Access Denied" instead of CORS error?

**Solution**: Your R2 credentials are incorrect or don't have permissions.
1. Regenerate your R2 API token in Cloudflare Dashboard
2. Make sure it has **"Object Read & Write"** permissions
3. Update both .env and Vercel environment variables
4. Redeploy

### Upload still fails after fixing everything?

**Check**:
1. ✅ Bucket name is `perksnow-media-dev` in .env
2. ✅ Bucket name is `perksnow-media-dev` in Vercel environment variables
3. ✅ CORS is configured on the R2 bucket
4. ✅ R2 API token has correct permissions
5. ✅ You've redeployed after changing Vercel environment variables

---

## 📝 Summary

**Fixed in code**:
- ✅ Default bucket name changed to `perksnow-media-dev`
- ✅ .env file updated with R2 configuration template

**You need to do**:
1. ⏳ Fill in actual R2 credentials in .env
2. ⏳ Add R2 environment variables to Vercel
3. ⏳ Redeploy your Vercel site
4. ⏳ Configure CORS on R2 bucket

After all steps complete, reel uploads will work! 🎥✨
