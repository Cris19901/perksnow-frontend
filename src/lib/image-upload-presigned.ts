import { supabase } from './supabase';

/**
 * Upload file directly to R2 using pre-signed URLs
 * This is the most reliable method for mobile uploads
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

  // Get current session and refresh if needed
  let session = (await supabase.auth.getSession()).data.session;

  // If no session or session is about to expire, try to refresh
  if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
    console.log('Session expired or expiring soon, refreshing...');
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session) {
      console.error('Session refresh error:', refreshError);
      throw new Error('Authentication error. Please try logging in again.');
    }
    session = data.session;
  }

  if (!session) {
    console.error('No session found');
    throw new Error('Not authenticated. Please log in to upload files.');
  }

  console.log('Starting pre-signed URL upload:', {
    bucket,
    fileType: file.type,
    fileSize: file.size,
    fileName: file.name,
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Retry logic for more reliable uploads with exponential backoff
  let lastError: Error | null = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));

        // Refresh session before retry to avoid token expiration
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          session = data.session;
          console.log('Session refreshed for retry');
        }
      }

      // Step 1: Get pre-signed URL from Edge Function with timeout
      console.log('Requesting pre-signed URL...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const urlResponse = await fetch(`${supabaseUrl}/functions/v1/generate-upload-url`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bucket,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!urlResponse.ok) {
        const errorText = await urlResponse.text();
        console.error('Failed to get pre-signed URL:', errorText);
        throw new Error(`Failed to generate upload URL: ${urlResponse.status}`);
      }

      const { uploadUrl, publicUrl, fileKey } = await urlResponse.json();
      console.log('Pre-signed URL received, uploading to R2...');

      // Step 2: Upload directly to R2 using pre-signed URL with timeout
      const uploadController = new AbortController();
      const uploadTimeoutId = setTimeout(() => uploadController.abort(), 60000); // 60 second timeout for upload

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
        signal: uploadController.signal,
      });

      clearTimeout(uploadTimeoutId);

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('R2 upload failed:', errorText);

        // Check for specific error types
        if (errorText.includes('SignatureDoesNotMatch')) {
          throw new Error('Upload signature error. Retrying...');
        } else if (errorText.includes('403')) {
          throw new Error('Upload permission denied. Please try again.');
        } else {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }
      }

      console.log('✅ Upload successful:', publicUrl);
      return publicUrl;

    } catch (error: any) {
      lastError = error;
      console.error(`Upload attempt ${attempt + 1} failed:`, error);

      // Handle abort/timeout errors
      if (error.name === 'AbortError') {
        lastError = new Error('Upload timeout. Please check your connection and try again.');
      }

      // Don't retry on certain errors
      if (error.message.includes('Authentication') ||
          error.message.includes('Not authenticated') ||
          error.message.includes('Invalid file') ||
          error.message.includes('too large')) {
        throw error;
      }

      // If this wasn't the last attempt, continue to retry
      if (attempt < maxRetries) {
        continue;
      }
    }
  }

  // All retries failed
  console.error('All upload attempts failed:', lastError);

  if (lastError?.message.includes('Failed to fetch') || lastError?.message.includes('Network')) {
    throw new Error('Network error. Please check your internet connection and try again.');
  }

  throw new Error(lastError?.message || 'Upload failed after multiple attempts. Please try again.');
}

/**
 * Delete a file from R2
 */
export async function deleteImage(url: string): Promise<void> {
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
