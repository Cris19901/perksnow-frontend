import { supabase } from './supabase';

/**
 * Hybrid upload function - tries Edge Function first, falls back to Supabase Storage
 * This ensures uploads work on both desktop and mobile
 */
export async function uploadImage(
  file: File,
  bucket: 'avatars' | 'posts' | 'products' | 'videos' | 'covers' | 'backgrounds',
  userId: string
): Promise<string> {
  // Validate file type
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi', 'video/mov'];
  const isImage = allowedImageTypes.includes(file.type);
  const isVideo = allowedVideoTypes.includes(file.type) || file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    throw new Error('Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF) or video');
  }

  // Validate file size
  const maxSize = (bucket === 'covers' || bucket === 'backgrounds')
    ? 10 * 1024 * 1024 // 10MB for covers
    : isVideo
    ? 100 * 1024 * 1024 // 100MB for videos
    : 5 * 1024 * 1024; // 5MB for other images

  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }

  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('Session error:', sessionError);
    throw new Error('Authentication error. Please try logging in again.');
  }
  if (!session) {
    console.error('No session found');
    throw new Error('Not authenticated. Please log in to upload files.');
  }

  console.log('Starting hybrid upload:', {
    bucket,
    fileType: file.type,
    fileSize: file.size,
    userId: session.user.id
  });

  // Try Edge Function first (secure, recommended)
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    console.log('Attempting Edge Function upload...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${supabaseUrl}/functions/v1/upload-media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('Edge Function response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', errorText);
      throw new Error(`Edge Function failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Edge Function upload successful:', result.url);
    return result.url;
  } catch (edgeFunctionError: any) {
    console.warn('⚠️ Edge Function upload failed, trying Supabase Storage fallback...', edgeFunctionError.message);

    // Fallback to Supabase Storage (works everywhere, but less secure)
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const randomId = crypto.randomUUID().split('-')[0];
      const filePath = `${userId}/${timestamp}-${randomId}.${fileExt}`;

      console.log('Uploading to Supabase Storage bucket:', bucket, 'path:', filePath);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase Storage error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      console.log('✅ Supabase Storage upload successful:', publicUrl);
      return publicUrl;
    } catch (storageError: any) {
      console.error('❌ Both upload methods failed:', storageError);
      throw new Error(`Upload failed: ${storageError.message}`);
    }
  }
}

/**
 * Delete a file from storage
 */
export async function deleteImage(url: string): Promise<void> {
  console.log('Delete image:', url);
  // TODO: Implement deletion
}

/**
 * Compress image before upload (client-side)
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
