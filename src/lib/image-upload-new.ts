import { supabase } from './supabase';

/**
 * Upload an image or video via Supabase Edge Function to R2
 * This is secure - credentials stay on the server
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
  if (sessionError || !session) {
    throw new Error('Not authenticated. Please log in to upload files.');
  }

  // Prepare form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Upload via Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/upload-media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  const { url } = await response.json();
  return url;
}

/**
 * Delete a file from R2
 * Note: This would need a separate Edge Function for secure deletion
 */
export async function deleteImage(url: string): Promise<void> {
  // For now, just log - implement delete Edge Function later if needed
  console.log('Delete image:', url);
  // TODO: Implement delete Edge Function
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
