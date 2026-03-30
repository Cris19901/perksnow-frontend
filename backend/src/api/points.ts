import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { PointsService } from '../services/points';
import { logger } from '../utils/logger';

const router = Router();

router.get('/balance', requireAuth, async (req, res) => {
  try {
    const balance = await PointsService.getBalance(req.user!.id);
    res.json({ success: true, ...balance });
  } catch (error: unknown) {
    logger.error('Points balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch points balance' });
  }
});

router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const analytics = await PointsService.getAnalytics(req.user!.id);
    res.json({ success: true, analytics });
  } catch (error: unknown) {
    logger.error('Points analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch points analytics' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    const history = await PointsService.getHistory({
      userId: req.user!.id,
      limit,
      offset,
      action: req.query.action as string | undefined,
    });
    res.json({ success: true, history, count: history.length });
  } catch (error: unknown) {
    logger.error('Points history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch points history' });
  }
});

router.post('/convert', requireAuth, async (req, res) => {
  try {
    const { points } = req.body;
    if (!points || typeof points !== 'number' || points < 100) {
      return res.status(400).json({ success: false, error: 'Minimum 100 points required for conversion' });
    }
    const result = await PointsService.convertPointsToMoney({ userId: req.user!.id, points });
    res.json(result);
  } catch (error: unknown) {
    logger.error('Points conversion error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to convert points' });
  }
});

/** Public endpoint — no auth required */
router.get('/rewards', async (_req, res) => {
  try {
    const rewards = await PointsService.getAvailableRewards();
    res.json({ success: true, rewards });
  } catch (error: unknown) {
    logger.error('Points rewards error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rewards' });
  }
});

router.post('/daily-login', requireAuth, async (req, res) => {
  try {
    const result = await PointsService.awardDailyLogin(req.user!.id);
    res.json(result);
  } catch (error: unknown) {
    logger.error('Daily login points error:', error);
    res.status(500).json({ success: false, error: 'Failed to award daily login points' });
  }
});

export default router;
