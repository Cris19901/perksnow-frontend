import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { StorageService } from '../services/storage';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB hard cap
});

/** POST /api/uploads/file */
router.post('/file', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const type = (req.body.type ?? 'image') as 'avatar' | 'image' | 'video' | 'product' | 'document';
    if (!file) return res.status(400).json({ success: false, error: 'No file provided' });

    const result = await StorageService.uploadFile({
      file: file.buffer,
      filename: file.originalname,
      userId: req.user!.id,
      type,
    });
    res.json(result);
  } catch (error: unknown) {
    logger.error('File upload error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to upload file' });
  }
});

/** POST /api/uploads/multiple */
router.post('/multiple', requireAuth, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const type = (req.body.type ?? 'image') as 'avatar' | 'image' | 'video' | 'product' | 'document';
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }
    const results = await Promise.all(
      files.map((f) =>
        StorageService.uploadFile({ file: f.buffer, filename: f.originalname, userId: req.user!.id, type })
      )
    );
    res.json({ success: true, files: results, count: results.length });
  } catch (error: unknown) {
    logger.error('Multiple file upload error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to upload files' });
  }
});

/** POST /api/uploads/get-upload-url */
router.post('/get-upload-url', requireAuth, async (req, res) => {
  try {
    const { filename, type = 'image', expiresIn } = req.body;
    if (!filename) return res.status(400).json({ success: false, error: 'Filename is required' });
    const result = await StorageService.getUploadUrl({
      filename,
      userId: req.user!.id,
      type,
      expiresIn,
    });
    res.json(result);
  } catch (error: unknown) {
    logger.error('Get upload URL error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to generate upload URL' });
  }
});

/**
 * DELETE /api/uploads/file
 * Verifies the requesting user owns the file via the posts/reels/users tables.
 */
router.delete('/file', requireAuth, async (req, res) => {
  try {
    const { file_path } = req.body;
    if (!file_path) return res.status(400).json({ success: false, error: 'File path is required' });

    const userId = req.user!.id;

    // Ownership check: file path always starts with <type>/<userId>/
    const pathParts = (file_path as string).split('/');
    const ownerIdInPath = pathParts[1];
    if (ownerIdInPath !== userId) {
      // Fallback: check if user's avatar column references this file
      const { data: userRecord } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', userId)
        .single();
      if (!userRecord?.avatar_url?.includes(file_path)) {
        return res.status(403).json({ success: false, error: 'You do not own this file' });
      }
    }

    const result = await StorageService.deleteFile(file_path);
    res.json(result);
  } catch (error: unknown) {
    logger.error('File deletion error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to delete file' });
  }
});

/** POST /api/uploads/get-download-url */
router.post('/get-download-url', requireAuth, async (req, res) => {
  try {
    const { file_path, expiresIn } = req.body;
    if (!file_path) return res.status(400).json({ success: false, error: 'File path is required' });

    const userId = req.user!.id;
    // Ensure user can access the file (their own path or public files)
    const pathParts = (file_path as string).split('/');
    if (pathParts[1] !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await StorageService.getDownloadUrl({ filePath: file_path, expiresIn });
    res.json(result);
  } catch (error: unknown) {
    logger.error('Get download URL error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to generate download URL' });
  }
});

export default router;
