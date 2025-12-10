# Cloudflare R2 CORS Configuration Guide

## 🚨 Error You're Seeing

```
Access to fetch at 'https://socialhub-uploads.r2.cloudflarestorage.com/...' from origin 'https://beta.perksnow.biz' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

This error occurs because your R2 bucket doesn't have CORS (Cross-Origin Resource Sharing) configured to allow uploads from your website.

---

## ✅ How to Fix (2 Minutes)

### Step 1: Log into Cloudflare Dashboard

1. Go to [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. Log in with your Cloudflare account
3. Click on **R2** in the left sidebar

### Step 2: Find Your R2 Bucket

1. You should see your bucket listed (probably named `socialhub-uploads` or similar)
2. Click on the bucket name to open it

### Step 3: Configure CORS Settings

1. Click on the **Settings** tab at the top
2. Scroll down to find the **CORS Policy** section
3. Click **Add CORS policy** or **Edit** if one already exists

### Step 4: Add This CORS Configuration

Copy and paste this JSON configuration:

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

**Important**: Make sure to replace `https://beta.perksnow.biz` with your actual domain if different!

### Step 5: Save the Configuration

1. Click **Save** or **Add CORS policy**
2. Wait a few seconds for the changes to propagate

### Step 6: Test the Upload

1. Go back to your website
2. **Hard refresh**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Try uploading a reel again
4. It should work now! 🎉

---

## 📋 What This CORS Policy Does

- **AllowedOrigins**: Tells R2 which websites can upload files
  - `https://beta.perksnow.biz` - Your production site
  - `http://localhost:5173` - Your local development (Vite default)
  - `http://localhost:3000` - Alternative local dev port

- **AllowedMethods**: What operations are allowed (GET, PUT, POST, DELETE, HEAD)

- **AllowedHeaders**: Which HTTP headers the browser can send (we allow all with `*`)

- **ExposeHeaders**: Which response headers the browser can read

- **MaxAgeSeconds**: How long the browser can cache this CORS policy (1 hour)

---

## 🔐 Security Notes

### ✅ Safe for Production

This CORS configuration is safe because:
- It only allows your specific domain(s)
- Uploads still require authentication (your R2 API tokens are not exposed)
- CORS only controls browser access, not API access

### 🔒 Optional: Tighten Security

If you want even more security, you can:

**1. Remove localhost after deploying:**
```json
{
  "AllowedOrigins": [
    "https://beta.perksnow.biz"
  ],
  ...
}
```

**2. Restrict methods to only what you need:**
```json
{
  "AllowedMethods": [
    "GET",
    "PUT"
  ],
  ...
}
```

**3. Restrict headers:**
```json
{
  "AllowedHeaders": [
    "Content-Type",
    "Content-Length",
    "Authorization"
  ],
  ...
}
```

---

## 🆘 Still Getting Errors?

### Error: "CORS policy still blocked"

**Solutions**:
1. **Hard refresh** your browser: `Ctrl+Shift+R`
2. **Clear browser cache**: Chrome → Settings → Privacy → Clear browsing data
3. **Wait 5 minutes**: CORS changes can take a few minutes to propagate
4. **Check the domain**: Make sure `https://beta.perksnow.biz` exactly matches your site URL (including https/http)

### Error: "Access Denied"

This is a different error from CORS. It means your R2 API credentials are wrong or don't have permissions.

**Solutions**:
1. Check your `.env` file has the correct:
   - `VITE_R2_ACCOUNT_ID`
   - `VITE_R2_ACCESS_KEY_ID`
   - `VITE_R2_SECRET_ACCESS_KEY`
2. Regenerate your R2 API token in Cloudflare Dashboard
3. Make sure the token has **"Object Read & Write"** permissions

### Error: "Bucket not found"

**Solutions**:
1. Check your bucket name in `.env`: `VITE_R2_BUCKET_NAME`
2. Make sure the bucket exists in your Cloudflare R2 dashboard

---

## 📚 Additional Resources

- [Cloudflare R2 CORS Documentation](https://developers.cloudflare.com/r2/buckets/cors/)
- [MDN Web Docs: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## ✨ Quick Summary

1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings
2. Add the CORS policy JSON from Step 4 above
3. Save and wait a minute
4. Hard refresh your site and try uploading again

That's it! Your reel uploads should work now. 🎥🚀
