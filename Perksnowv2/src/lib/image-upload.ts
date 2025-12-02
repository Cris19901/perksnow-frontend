import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, r2Config, isR2Configured } from './r2-client';
import { supabase } from './supabase';

/**
 * Upload an image or video to R2 or Supabase Storage (fallback)
 * @param file - The file to upload
 * @param bucket - The storage bucket ('avatars', 'posts', 'products', 'videos')
 * @param userId - The user's ID for organizing files
 * @returns The public URL of the uploaded file
 */
export async function uploadImage(
  file: File,
  bucket: 'avatars' | 'posts' | 'products' | 'videos',
  userId: string
): Promise<string> {
  // Validate file type (images and videos)
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/avi', 'video/mov'];
  const isImage = allowedImageTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type) || file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF) or video');
  }

  // Validate file size
  const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for videos, 5MB for images
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${isVideo ? '50MB' : '5MB'}`);
  }

  // Use R2 if configured, otherwise fall back to Supabase
  if (isR2Configured()) {
    return uploadToR2(file, bucket, userId);
  } else {
    console.warn('R2 not configured, falling back to Supabase Storage');
    return uploadToSupabase(file, bucket, userId);
  }
}

/**
 * Upload to Cloudflare R2
 */
async function uploadToR2(
  file: File,
  bucket: 'avatars' | 'posts' | 'products' | 'videos',
  userId: string
): Promise<string> {
  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${bucket}/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Upload to R2
  const command = new PutObjectCommand({
    Bucket: r2Config.bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000', // Cache for 1 year
  });

  try {
    await r2Client.send(command);

    // Return public URL
    // If you have a custom domain for R2, use r2Config.publicUrl
    // Otherwise, use the R2.dev public URL format
    if (r2Config.publicUrl) {
      return `${r2Config.publicUrl}/${fileName}`;
    } else {
      // R2 public URL format: https://pub-<account>.r2.dev/<filename>
      // Note: You need to enable public access on your R2 bucket
      return `https://pub-${r2Config.accountId}.r2.dev/${fileName}`;
    }
  } catch (error: any) {
    console.error('R2 upload error:', error);

    // Provide more specific error messages
    if (error.message?.includes('fetch')) {
      throw new Error(
        'R2 upload failed: CORS error. Please configure R2 CORS settings. ' +
        'See R2_CORS_CONFIGURATION.md for instructions.'
      );
    } else if (error.message?.includes('timeout')) {
      throw new Error('R2 upload failed: Upload timeout. Try a smaller file or check your connection.');
    } else if (error.message?.includes('Access Denied')) {
      throw new Error('R2 upload failed: Access denied. Check R2 API token permissions.');
    } else {
      throw new Error(`R2 upload failed: ${error.message}`);
    }
  }
}

/**
 * Upload to Supabase Storage (fallback)
 */
async function uploadToSupabase(
  file: File,
  bucket: 'avatars' | 'posts' | 'products' | 'videos',
  userId: string
): Promise<string> {
  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  // Map bucket names for Supabase
  const bucketMap = {
    avatars: 'avatars',
    posts: 'post-images',
    products: 'product-images',
    videos: 'videos',
  };

  const supabaseBucket = bucketMap[bucket];

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(supabaseBucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(supabaseBucket)
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete a file from R2 or Supabase Storage
 * @param url - The public URL of the file
 * @param bucket - The storage bucket
 */
export async function deleteImage(
  url: string,
  bucket: 'avatars' | 'posts' | 'products' | 'videos'
): Promise<void> {
  if (isR2Configured() && url.includes('r2.dev')) {
    return deleteFromR2(url);
  } else {
    return deleteFromSupabase(url, bucket);
  }
}

/**
 * Delete from Cloudflare R2
 */
async function deleteFromR2(url: string): Promise<void> {
  // Extract file path from URL
  // Format: https://pub-<account>.r2.dev/<path>
  // or: https://your-domain.com/<path>
  let filePath: string;

  if (r2Config.publicUrl && url.startsWith(r2Config.publicUrl)) {
    filePath = url.replace(`${r2Config.publicUrl}/`, '');
  } else {
    // Extract from R2.dev URL
    const urlParts = url.split('.r2.dev/');
    if (urlParts.length < 2) {
      throw new Error('Invalid R2 URL');
    }
    filePath = urlParts[1];
  }

  const command = new DeleteObjectCommand({
    Bucket: r2Config.bucketName,
    Key: filePath,
  });

  try {
    await r2Client.send(command);
  } catch (error: any) {
    console.error('R2 delete error:', error);
    throw new Error(`R2 delete failed: ${error.message}`);
  }
}

/**
 * Delete from Supabase Storage (fallback)
 */
async function deleteFromSupabase(
  url: string,
  bucket: 'avatars' | 'posts' | 'products' | 'videos'
): Promise<void> {
  // Map bucket names for Supabase
  const bucketMap = {
    avatars: 'avatars',
    posts: 'post-images',
    products: 'product-images',
    videos: 'videos',
  };

  const supabaseBucket = bucketMap[bucket];

  // Extract file path from URL
  const urlParts = url.split(`/${supabaseBucket}/`);
  if (urlParts.length < 2) {
    throw new Error('Invalid Supabase Storage URL');
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(supabaseBucket)
    .remove([filePath]);

  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

/**
 * Compress image before upload (client-side)
 * @param file - The original file
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 * @param quality - JPEG quality (0-1)
 * @returns Compressed file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
  });
}
