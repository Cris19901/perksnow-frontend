# Profile Photo Upload Fix Guide

## Problem Summary

The profile photo upload is failing with these errors:
1. `ERR_SSL_BAD_RECORD_MAC_ALERT` - SSL/TLS error when uploading to R2
2. `ERR_CONNECTION_CLOSED` - Database connection error
3. `avatars/undefined/...` - User ID is undefined in upload path

## Root Causes

1. **R2 Client-Side Upload**: Uploading directly from browser to R2 exposes credentials and causes CORS/SSL issues
2. **Missing Environment Variables**: R2 credentials may not be properly configured
3. **CORS Not Configured**: R2 bucket doesn't allow browser uploads

## Recommended Solution: Switch to Supabase Storage

Supabase has built-in storage that's designed for client-side uploads and is already integrated.

### Step 1: Enable Supabase Storage

1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `avatars`
3. Set it to **Public** (or configure RLS policies)
4. Create another bucket called `covers`

### Step 2: Update image-upload.ts

Replace the file with Supabase storage upload:

```typescript
import { supabase } from './supabase';

export async function uploadImage(
  file: File,
  bucket: 'avatars' | 'posts' | 'products' | 'videos' | 'covers' | 'backgrounds',
  userId: string
): Promise<string> {
  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF)');
  }

  // Validate file size (5MB for most, 10MB for covers)
  const maxSize = bucket === 'covers' || bucket === 'backgrounds' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

export async function deleteImage(url: string): Promise<void> {
  // Extract bucket and path from URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const urlParts = url.split('/storage/v1/object/public/');
  if (urlParts.length < 2) {
    throw new Error('Invalid storage URL');
  }

  const [bucket, ...pathParts] = urlParts[1].split('/');
  const filePath = pathParts.join('/');

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
```

### Step 3: Create Storage Buckets in Supabase

Run this in Supabase SQL Editor to configure storage policies:

```sql
-- Create storage buckets (if not exist via dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('covers', 'covers', true),
  ('backgrounds', 'backgrounds', true),
  ('posts', 'posts', true),
  ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('avatars', 'covers', 'backgrounds', 'posts', 'products')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view public files
CREATE POLICY "Public files are viewable by everyone"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'covers', 'backgrounds', 'posts', 'products'));

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('avatars', 'covers', 'backgrounds', 'posts', 'products')
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Step 4: Test the Upload

1. Go to your profile page
2. Click the camera icon on your avatar
3. Select an image
4. It should upload successfully

## Alternative: Keep R2 but Use Server-Side Upload

If you want to keep using R2:

1. **Remove R2 credentials from frontend** (delete from .env)
2. **Create a Supabase Edge Function** for uploads:
   - Frontend sends file to Edge Function
   - Edge Function uploads to R2
   - Returns public URL
3. **Configure CORS on R2 bucket**

This is more complex but keeps R2 as your storage solution.

## Quick Test

To verify if the issue is R2-related, temporarily check in browser console:

```javascript
// Check if user is defined
console.log('User:', user);

// Check R2 config
console.log('R2 Account ID:', import.meta.env.VITE_R2_ACCOUNT_ID);
```

If `user` is undefined, the issue is with authentication, not R2.
If R2 Account ID is undefined, environment variables aren't loaded.

## Next Steps

1. Choose Solution (Supabase Storage recommended)
2. Implement the changes
3. Test upload functionality
4. Verify images display correctly

---

**Recommendation**: Use Supabase Storage. It's simpler, more secure, and designed for this exact use case.
