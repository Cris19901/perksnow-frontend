import { S3Client } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2 Client Configuration
 * R2 is S3-compatible, so we use the AWS SDK
 */

// R2 Configuration from environment variables
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'perksnow-media-dev';
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

// Create R2 client
export const r2Client = new S3Client({
  region: 'auto', // R2 uses 'auto' for region
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Export configuration
export const r2Config = {
  bucketName: R2_BUCKET_NAME,
  publicUrl: R2_PUBLIC_URL,
  accountId: R2_ACCOUNT_ID,
};

// Check if R2 is properly configured
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}
