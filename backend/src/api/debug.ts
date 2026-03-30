import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { config } from '../config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * This endpoint is disabled in production.
 * In development it requires a valid auth token.
 */
router.use(requireAuth);
router.use((_req, res, next) => {
  if (config.isProduction) {
    return res.status(404).json({ success: false, error: 'Not found' });
  }
  next();
});

/** GET /api/debug/supabase */
router.get('/supabase', async (req, res) => {
  try {
    const keyPreview = config.supabase.serviceRoleKey.substring(0, 15) + '...';
    logger.info(`Debug supabase check`, { requestId: req.requestId });

    const [tiersResult, rewardsResult] = await Promise.all([
      supabase.from('membership_tiers').select('id, name').limit(3),
      supabase.from('points_rewards').select('activity, points').limit(3),
    ]);

    res.json({
      success: true,
      config: { url: config.supabase.url, keyPreview },
      tests: {
        membership_tiers: { success: !tiersResult.error, data: tiersResult.data, error: tiersResult.error?.message },
        points_rewards: { success: !rewardsResult.error, data: rewardsResult.data, error: rewardsResult.error?.message },
      },
    });
  } catch (error: unknown) {
    logger.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/debug/health */
router.get('/health', async (_req, res) => {
  const { error } = await supabase.from('membership_tiers').select('id').limit(1);
  res.json({
    api: 'ok',
    database: error ? 'error' : 'ok',
    db_error: error?.message,
    uptime: process.uptime(),
  });
});

export default router;
