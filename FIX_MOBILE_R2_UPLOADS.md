# Fix Mobile R2 Upload 502 Errors - Pre-Signed URL Solution

## Problem Summary

- **Issue:** 502 Bad Gateway errors when uploading to R2 from mobile devices
- **Works on:** Desktop browsers
- **Fails on:** Mobile devices (iOS/Android)
- **Root cause:** Edge Function proxy timing out on mobile networks when uploading large files

## Solution: Pre-Signed URLs

Instead of uploading files through the Edge Function (which can timeout), we now use pre-signed URLs to upload directly to R2:

### Old Flow (Causing 502 Errors)
```
Mobile → Edge Function → R2
        ↑ 502 timeout here
```

### New Flow (Reliable)
```
Mobile → Edge Function (get URL)
Mobile → R2 (direct upload)
```

## What Changed

### 1. New Edge Function: `generate-upload-url`
- Generates a secure pre-signed URL for R2
- URL is valid for 5 minutes
- No file data passes through Edge Function
- Located: `supabase/functions/generate-upload-url/index.ts`

### 2. New Upload Library: `image-upload-presigned.ts`
- Uses pre-signed URLs for all uploads
- Two-step process:
  1. Get pre-signed URL from Edge Function
  2. Upload file directly to R2
- Located: `src/lib/image-upload-presigned.ts`

### 3. Updated Components
All upload components now use the pre-signed URL approach:
- `OnboardingFlow.tsx` - Avatar uploads during signup
- `ProfilePage.tsx` - Profile & cover photo uploads
- `ReelUpload.tsx` - Video uploads
- `StoryUpload.tsx` - Story uploads

## Deployment Steps

### Option 1: PowerShell Script (Easiest)
```powershell
.\deploy-presigned-url.ps1
```

### Option 2: Manual Deployment
```bash
npx supabase functions deploy generate-upload-url
```

## How It Works

### Step 1: Request Pre-Signed URL
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/generate-upload-url`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    bucket: 'avatars',
    fileName: 'photo.jpg',
    fileType: 'image/jpeg',
    fileSize: 123456,
  }),
});

const { uploadUrl, publicUrl } = await response.json();
```

### Step 2: Upload Directly to R2
```typescript
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'image/jpeg' },
  body: file,
});
```

### Step 3: Use Public URL
```typescript
// Save publicUrl to database
await supabase.from('users').update({ avatar_url: publicUrl });
```

## Benefits

### 1. **Eliminates 502 Errors**
- No large file transfers through Edge Function
- Direct upload to R2 bypasses proxy timeouts

### 2. **Faster Uploads**
- One less hop in the network path
- No Edge Function processing overhead

### 3. **Better Mobile Performance**
- Works reliably on slow mobile networks
- No timeout issues with large files

### 4. **More Scalable**
- Edge Function only generates URLs (fast)
- Doesn't consume Edge Function bandwidth
- R2 handles upload traffic directly

### 5. **Still Secure**
- Pre-signed URLs expire after 5 minutes
- Authentication checked before generating URL
- URLs are unique and single-use

## Verification

After deployment, test uploads on mobile:

1. **Profile Photo Upload**
   - Go to Profile page
   - Click edit profile photo
   - Upload from mobile device
   - Should complete without 502 errors

2. **Reel Upload**
   - Go to Reels section
   - Upload a video
   - Should work smoothly on mobile

3. **Story Upload**
   - Click "Add Story"
   - Upload photo/video
   - Should upload directly to R2

## Console Logs

You should see these logs on successful upload:

```
Starting pre-signed URL upload: { bucket: 'avatars', fileType: 'image/jpeg', ... }
Requesting pre-signed URL...
Pre-signed URL received, uploading to R2...
✅ Upload successful: https://pub-xxx.r2.dev/avatars/user-id/12345.jpg
```

## Troubleshooting

### If uploads still fail:

1. **Check Edge Function logs:**
   ```bash
   npx supabase functions logs generate-upload-url
   ```

2. **Verify R2 credentials are set:**
   ```bash
   npx supabase secrets list
   ```
   Should show: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

3. **Check browser console for errors:**
   - Look for "Failed to generate upload URL"
   - Look for "Upload failed" during R2 upload step

### Common Issues:

**"Failed to generate upload URL"**
- Edge Function deployment failed
- R2 credentials missing or incorrect

**"Upload failed: 403"**
- Pre-signed URL expired (5 minute limit)
- Incorrect file content type

**"Upload failed: 404"**
- R2 bucket doesn't exist
- R2_BUCKET_NAME incorrect

## Architecture Comparison

### Previous Approach (Failing on Mobile)
```
Client                    Edge Function              R2
  |                            |                      |
  |------- POST file --------->|                      |
  |                            |---- Upload file ---->|
  |                            |<---- Success --------|
  |<------ Success ------------|                      |
  ↑                            ↑
  Timeout on mobile       Slow on mobile networks
```

### New Approach (Works Everywhere)
```
Client                    Edge Function              R2
  |                            |                      |
  |-- Request URL (small) ---->|                      |
  |<-- Pre-signed URL ---------|                      |
  |                                                   |
  |---------------- Direct upload ------------------>|
  |<--------------- Success -------------------------|
  ✅                                                  ✅
  Fast & reliable            No file transfer      Direct upload
```

## Cost Impact

**No additional cost!**
- R2 free tier: 10GB storage, unlimited free egress
- Edge Functions: Still within free tier (URL generation is fast)
- Actually saves Edge Function bandwidth (no file proxying)

## Next Steps

1. Deploy the new Edge Function
2. Test uploads on mobile devices
3. Monitor for any remaining issues
4. Consider adding upload progress tracking for better UX

## Files Modified

- ✅ `supabase/functions/generate-upload-url/index.ts` - New Edge Function
- ✅ `src/lib/image-upload-presigned.ts` - New upload library
- ✅ `src/components/OnboardingFlow.tsx` - Updated import
- ✅ `src/components/pages/ProfilePage.tsx` - Updated import
- ✅ `src/components/ReelUpload.tsx` - Updated import
- ✅ `src/components/StoryUpload.tsx` - Updated import
- ✅ `deploy-presigned-url.ps1` - Deployment script

## References

- [AWS S3 Pre-Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
