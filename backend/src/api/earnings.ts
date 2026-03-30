import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { EarningsService } from '../services/earnings';
import { logger } from '../utils/logger';

const router = Router();

router.get('/analytics', requireAuth, async (req, res) => {
  try {
    res.json(await EarningsService.getEarningsAnalytics(req.user!.id));
  } catch (error: unknown) {
    logger.error('Earnings analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch earnings analytics' });
  }
});

router.get('/total', requireAuth, async (req, res) => {
  try {
    res.json(await EarningsService.getTotalEarnings(req.user!.id));
  } catch (error: unknown) {
    logger.error('Total earnings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch total earnings' });
  }
});

router.get('/breakdown', requireAuth, async (req, res) => {
  try {
    res.json(await EarningsService.getEarningsBreakdown(req.user!.id));
  } catch (error: unknown) {
    logger.error('Earnings breakdown error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch earnings breakdown' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    const history = await EarningsService.getEarningsHistory({
      userId: req.user!.id,
      limit,
      offset,
      type: req.query.type as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });
    res.json(history);
  } catch (error: unknown) {
    logger.error('Earnings history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch earnings history' });
  }
});

router.get('/wallet', requireAuth, async (req, res) => {
  try {
    res.json(await EarningsService.getWalletBalance(req.user!.id));
  } catch (error: unknown) {
    logger.error('Wallet balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet balance' });
  }
});

export default router;
