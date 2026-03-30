import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';

let _s3: S3Client | null = null;
function s3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return _s3;
}

type FileType = 'avatar' | 'image' | 'video' | 'product' | 'document';

const MAX_SIZES: Record<FileType, number> = {
  avatar: 5 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  product: 10 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

const ALLOWED_EXTENSIONS: Record<FileType, string[]> = {
  avatar: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
  video: ['mp4', 'webm', 'mov'],
  product: ['jpg', 'jpeg', 'png', 'webp'],
  document: ['pdf', 'doc', 'docx', 'txt'],
};

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

export class StorageService {
  static getFilePath(type: FileType, userId: string, filename: string): string {
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
    const folder = type === 'image' ? 'images' : `${type}s`;
    return `${folder}/${userId}/${timestamp}_${uniqueId}.${ext}`;
  }

  static getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return CONTENT_TYPES[ext] ?? 'application/octet-stream';
  }

  static validateFile(params: { filename: string; size: number; type: FileType }) {
    const { filename, size, type } = params;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (size > MAX_SIZES[type]) {
      return { valid: false, error: `File too large. Max ${MAX_SIZES[type] / (1024 * 1024)}MB for ${type}` };
    }
    if (!ALLOWED_EXTENSIONS[type].includes(ext)) {
      return { valid: false, error: `File type .${ext} not allowed for ${type}. Allowed: ${ALLOWED_EXTENSIONS[type].join(', ')}` };
    }
    return { valid: true };
  }

  static async uploadFile(params: {
    file: Buffer;
    filename: string;
    userId: string;
    type: FileType;
    metadata?: Record<string, string>;
  }) {
    const { file, filename, userId, type, metadata = {} } = params;
    logger.info(`Uploading ${type}: ${filename} for user ${userId}`);

    const validation = this.validateFile({ filename, size: file.length, type });
    if (!validation.valid) throw new Error(validation.error);

    const filePath = this.getFilePath(type, userId, filename);
    const contentType = this.getContentType(filename);

    try {
      await s3().send(
        new PutObjectCommand({
          Bucket: config.r2.bucketName,
          Key: filePath,
          Body: file,
          ContentType: contentType,
          Metadata: { userId, type, originalName: filename, ...metadata },
        })
      );
      return {
        success: true,
        url: `${config.r2.publicUrl}/${filePath}`,
        path: filePath,
        size: file.length,
        contentType,
      };
    } catch (error) {
      logger.error('R2 upload error:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  static async deleteFile(filePath: string) {
    logger.info(`Deleting file: ${filePath}`);
    try {
      await s3().send(new DeleteObjectCommand({ Bucket: config.r2.bucketName, Key: filePath }));
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      logger.error('R2 delete error:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  static async getUploadUrl(params: {
    filename: string;
    userId: string;
    type: FileType;
    expiresIn?: number;
  }) {
    const { filename, userId, type, expiresIn = 3600 } = params;
    const filePath = this.getFilePath(type, userId, filename);
    const contentType = this.getContentType(filename);

    try {
      const presignedUrl = await getSignedUrl(
        s3(),
        new PutObjectCommand({ Bucket: config.r2.bucketName, Key: filePath, ContentType: contentType }),
        { expiresIn }
      );
      return {
        success: true,
        uploadUrl: presignedUrl,
        fileUrl: `${config.r2.publicUrl}/${filePath}`,
        filePath,
        expiresIn,
      };
    } catch (error) {
      logger.error('Presigned URL error:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  static async getDownloadUrl(params: { filePath: string; expiresIn?: number }) {
    const { filePath, expiresIn = 3600 } = params;
    try {
      const presignedUrl = await getSignedUrl(
        s3(),
        new GetObjectCommand({ Bucket: config.r2.bucketName, Key: filePath }),
        { expiresIn }
      );
      return { success: true, downloadUrl: presignedUrl, expiresIn };
    } catch (error) {
      logger.error('Download URL error:', error);
      throw new Error('Failed to generate download URL');
    }
  }

  static getFileUrl(filePath: string): string {
    return `${config.r2.publicUrl}/${filePath}`;
  }
}
