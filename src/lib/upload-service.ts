/**
 * Unified Upload Service
 *
 * Consolidates all upload functionality into a single, robust service.
 * Uses pre-signed URLs for secure R2 uploads (credentials never exposed to client).
 *
 * Features:
 * - Retry logic with exponential backoff
 * - Progress tracking via XHR
 * - Dynamic timeouts based on file size
 * - HEIC/HEIF support for iOS
 * - Image compression
 * - Video utilities (metadata, thumbnails)
 */

import { supabase } from './supabase';
import { logger } from './logger';

// ============================================
// Types
// ============================================

export type BucketType = 'avatars' | 'posts' | 'products' | 'videos' | 'covers' | 'backgrounds';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  maxRetries?: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

// ============================================
// Constants
// ============================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence'
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/avi',
  'video/mov'
];

const FILE_SIZE_LIMITS = {
  avatars: 20 * 1024 * 1024,     // 20MB
  posts: 20 * 1024 * 1024,       // 20MB
  products: 20 * 1024 * 1024,    // 20MB
  videos: 200 * 1024 * 1024,     // 200MB
  covers: 20 * 1024 * 1024,      // 20MB
  backgrounds: 20 * 1024 * 1024, // 20MB
};

const DEFAULT_MAX_RETRIES = 3;

// ============================================
// File Type Helpers
// ============================================

/**
 * Check if file is an image (including HEIC support)
 */
function isImageFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const isHEIC = fileName.endsWith('.heic') || fileName.endsWith('.heif');
  const fileType = file.type?.toLowerCase() || '';

  return isHEIC ||
         ALLOWED_IMAGE_TYPES.includes(fileType) ||
         /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
}

/**
 * Check if file is a video
 */
function isVideoFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  const fileType = file.type?.toLowerCase() || '';

  return ALLOWED_VIDEO_TYPES.includes(fileType) ||
         file.type?.startsWith('video/') ||
         /\.(mp4|mov|webm|avi)$/i.test(fileName);
}

/**
 * Get maximum file size for bucket type and file type
 */
function getMaxFileSize(bucket: BucketType, isVideo: boolean): number {
  if (bucket === 'videos' || isVideo) {
    return FILE_SIZE_LIMITS.videos;
  }
  return FILE_SIZE_LIMITS[bucket] || FILE_SIZE_LIMITS.posts;
}

// ============================================
// Session Management
// ============================================

/**
 * Get valid session, refreshing if needed
 */
async function getValidSession() {
  let session = (await supabase.auth.getSession()).data.session;

  // Refresh if expired or expiring within 1 minute
  if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 60000)) {
    logger.log('Session expired or expiring soon, refreshing...');
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      logger.error('Session refresh failed', error);
      throw new Error('Authentication error. Please try logging in again.');
    }
    session = data.session;
  }

  if (!session) {
    throw new Error('Not authenticated. Please log in to upload files.');
  }

  return session;
}

// ============================================
// Upload Functions
// ============================================

/**
 * Upload a file to R2 using pre-signed URLs
 *
 * @param file - The file to upload
 * @param bucket - Target bucket
 * @param userId - User ID (for organizing files)
 * @param options - Upload options (progress callback, retries)
 * @returns Public URL of uploaded file
 */
export async function uploadFile(
  file: File,
  bucket: BucketType,
  userId: string,
  options: UploadOptions = {}
): Promise<string> {
  const { onProgress, maxRetries = DEFAULT_MAX_RETRIES } = options;

  // Validate file type
  const isImage = isImageFile(file);
  const isVideo = isVideoFile(file);

  if (!isImage && !isVideo) {
    throw new Error('Invalid file type. Please upload an image (JPEG, PNG, WebP, GIF, HEIC) or video');
  }

  // Validate file size
  const maxSize = getMaxFileSize(bucket, isVideo);
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
  }

  // Get session
  let session = await getValidSession();

  logger.log('Starting upload', {
    bucket,
    fileType: file.type,
    fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
    fileName: file.name,
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  // Retry logic with exponential backoff
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.log(`Retry attempt ${attempt}/${maxRetries} after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));

        // Refresh session before retry
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          session = data.session;
        }
      }

      // Step 1: Get pre-signed URL
      const { uploadUrl, publicUrl } = await getPresignedUrl(
        supabaseUrl,
        session.access_token,
        bucket,
        file
      );

      // Step 2: Upload to R2
      if (onProgress) {
        // Use XHR for progress tracking
        return await uploadWithProgress(uploadUrl, publicUrl, file, onProgress);
      } else {
        // Use fetch for simpler uploads
        return await uploadWithFetch(uploadUrl, publicUrl, file);
      }

    } catch (error: any) {
      lastError = error;
      logger.error(`Upload attempt ${attempt + 1} failed`, error);

      // Handle abort/timeout
      if (error.name === 'AbortError') {
        lastError = new Error('Upload timeout. Please check your connection and try again.');
      }

      // Don't retry on certain errors
      if (
        error.message.includes('Authentication') ||
        error.message.includes('Not authenticated') ||
        error.message.includes('Invalid file') ||
        error.message.includes('too large')
      ) {
        throw error;
      }

      if (attempt >= maxRetries) break;
    }
  }

  // All retries failed
  logger.error('All upload attempts failed', lastError);

  if (lastError?.message.includes('Failed to fetch') || lastError?.message.includes('Network')) {
    throw new Error('Network error. Please check your internet connection and try again.');
  }

  throw new Error(lastError?.message || 'Upload failed after multiple attempts. Please try again.');
}

/**
 * Get pre-signed URL from Edge Function
 */
async function getPresignedUrl(
  supabaseUrl: string,
  accessToken: string,
  bucket: BucketType,
  file: File
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to get pre-signed URL', errorText);
      throw new Error(`Failed to generate upload URL: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upload using fetch (simpler, no progress)
 */
async function uploadWithFetch(
  uploadUrl: string,
  publicUrl: string,
  file: File
): Promise<string> {
  const controller = new AbortController();
  // Dynamic timeout: 60s base + 30s per 10MB, max 5 minutes
  const timeoutMs = Math.min(60000 + Math.floor(file.size / (10 * 1024 * 1024)) * 30000, 300000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      handleUploadError(errorText, response.status);
    }

    logger.log('Upload successful', publicUrl);
    return publicUrl;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upload using XHR (with progress tracking)
 */
async function uploadWithProgress(
  uploadUrl: string,
  publicUrl: string,
  file: File,
  onProgress: (progress: UploadProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
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
        logger.log('Upload successful', publicUrl);
        resolve(publicUrl);
      } else {
        logger.error('Upload failed', { status: xhr.status, statusText: xhr.statusText });
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload. Please check your connection.'));
    });

    // Handle timeout
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out. Please try a smaller file or check your connection.'));
    });

    // Configure request
    xhr.open('PUT', uploadUrl, true);
    xhr.setRequestHeader('Content-Type', file.type);
    // Dynamic timeout: 60s base + 30s per 10MB, max 5 minutes
    xhr.timeout = Math.min(60000 + Math.floor(file.size / (10 * 1024 * 1024)) * 30000, 300000);

    xhr.send(file);
  });
}

/**
 * Handle upload error responses
 */
function handleUploadError(errorText: string, status: number): never {
  logger.error('R2 upload failed', errorText);

  if (errorText.includes('SignatureDoesNotMatch')) {
    throw new Error('Upload signature error. Retrying...');
  } else if (errorText.includes('403')) {
    throw new Error('Upload permission denied. Please try again.');
  } else {
    throw new Error(`Upload failed: ${status}`);
  }
}

// ============================================
// Convenience Aliases
// ============================================

/**
 * Upload an image (alias for uploadFile)
 */
export async function uploadImage(
  file: File,
  bucket: BucketType,
  userId: string,
  options?: UploadOptions
): Promise<string> {
  return uploadFile(file, bucket, userId, options);
}

/**
 * Upload a video with progress tracking
 */
export async function uploadVideo(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  return uploadFile(file, 'videos', userId, { onProgress });
}

// ============================================
// Image Compression
// ============================================

/**
 * Compress image before upload (client-side)
 *
 * @param file - Original file
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

        // Calculate new dimensions maintaining aspect ratio
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

            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

// ============================================
// File Validation
// ============================================

/**
 * Validate image file before upload
 *
 * @param file - File to validate
 * @param maxSizeMB - Maximum size in MB
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File, maxSizeMB: number = 20): string | null {
  if (!isImageFile(file)) {
    return 'Please upload a valid image file (JPG, PNG, GIF, WebP, or HEIC)';
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }

  return null;
}

/**
 * Validate video file before upload
 */
export function validateVideoFile(file: File, maxSizeMB: number = 200): string | null {
  if (!isVideoFile(file)) {
    return 'Please upload a valid video file (MP4, MOV, WebM, or AVI)';
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `Video size must be less than ${maxSizeMB}MB`;
  }

  return null;
}

// ============================================
// Video Utilities
// ============================================

/**
 * Get video metadata (duration, dimensions)
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
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
 * Generate thumbnail from video
 *
 * @param file - Video file
 * @param seekTime - Time in seconds to capture thumbnail
 * @returns Thumbnail blob
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
      // Seek to desired time (or 10% of video, whichever is smaller)
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

// ============================================
// Delete (placeholder)
// ============================================

/**
 * Delete a file from R2
 * Note: Requires delete Edge Function implementation
 */
export async function deleteFile(url: string): Promise<void> {
  logger.log('Delete file requested', url);
  // TODO: Implement delete Edge Function
}

// Alias for backward compatibility
export const deleteImage = deleteFile;
