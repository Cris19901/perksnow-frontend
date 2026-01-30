import { supabase } from './supabase';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Optimized video upload with progress tracking and larger timeout
 */
export async function uploadVideo(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  // Validate file type
  const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi', 'video/mov'];
  const fileName = file.name.toLowerCase();
  const fileType = file.type ? file.type.toLowerCase() : '';

  const isVideo = allowedVideoTypes.includes(fileType) ||
                  file.type.startsWith('video/') ||
                  fileName.match(/\.(mp4|mov|webm|avi)$/i);

  if (!isVideo) {
    throw new Error('Invalid file type. Please upload a video file');
  }

  // Validate file size (max 200MB)
  const maxSize = 200 * 1024 * 1024; // 200MB
  if (file.size > maxSize) {
    throw new Error(`Video too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }

  // Recommend compression for files over 40MB
  if (file.size > 40 * 1024 * 1024) {
    console.warn('Large video detected. Consider compressing before upload for faster speeds.');
  }

  // Get current session
  let session = (await supabase.auth.getSession()).data.session;

  if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
    console.log('Session expired or expiring soon, refreshing...');
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session) {
      throw new Error('Authentication error. Please try logging in again.');
    }
    session = data.session;
  }

  if (!session) {
    throw new Error('Not authenticated. Please log in to upload videos.');
  }

  console.log('Starting video upload:', {
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    fileName: file.name,
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Step 1: Get pre-signed URL
  console.log('Requesting pre-signed URL...');
  const urlResponse = await fetch(`${supabaseUrl}/functions/v1/generate-upload-url`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucket: 'videos',
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  if (!urlResponse.ok) {
    const errorText = await urlResponse.text();
    console.error('Failed to get pre-signed URL:', errorText);
    throw new Error(`Failed to generate upload URL: ${urlResponse.status}`);
  }

  const { uploadUrl, publicUrl } = await urlResponse.json();
  console.log('Pre-signed URL received, uploading video...');

  // Step 2: Upload with progress tracking and increased timeout
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percentage: Math.round((e.loaded / e.total) * 100)
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('✅ Video upload successful:', publicUrl);
        resolve(publicUrl);
      } else {
        console.error('Video upload failed:', xhr.status, xhr.statusText);
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      console.error('Upload error');
      reject(new Error('Network error during upload. Please check your connection.'));
    });

    // Handle timeout - increased to 5 minutes for large videos
    xhr.addEventListener('timeout', () => {
      console.error('Upload timeout');
      reject(new Error('Upload timed out. Please try a smaller file or check your connection.'));
    });

    // Configure request
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.timeout = 300000; // 5 minutes (300 seconds)

    // Start upload
    xhr.send(file);
  });
}

/**
 * Compress video on client-side using canvas (for very basic compression)
 * Note: For better compression, recommend using a server-side solution or native mobile compression
 */
export async function compressVideoBasic(
  file: File,
  targetSizeMB: number = 40
): Promise<File> {
  // If file is already smaller than target, return as-is
  if (file.size <= targetSizeMB * 1024 * 1024) {
    return file;
  }

  // For now, just return original file
  // Client-side video compression is complex and resource-intensive
  // Better handled by backend or during recording with native APIs
  console.warn('Video compression not yet implemented. Consider recording at lower quality.');
  return file;
}

/**
 * Get video metadata (duration, dimensions) without uploading
 */
export async function getVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * Generate thumbnail from video at specific time
 */
export async function generateVideoThumbnail(
  file: File,
  seekTime: number = 1
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Seek to desired time (or 1 second, whichever is smaller)
      video.currentTime = Math.min(seekTime, video.duration * 0.1);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not generate thumbnail'));
          }
          URL.revokeObjectURL(video.src);
        },
        'image/jpeg',
        0.8
      );
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}
