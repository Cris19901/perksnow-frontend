import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimit';
import { MembershipService } from '../services/membership';
import { PaymentService } from '../services/payment';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const router = Router();

/** GET /api/memberships/tiers */
router.get('/tiers', async (_req, res) => {
  try {
    const tiers = await MembershipService.getTiers();
    res.json({
      success: true,
      tiers: tiers.map((t) => ({ ...t, monthly_price: t.monthly_price / 100, yearly_price: t.yearly_price / 100 })),
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch tiers:', error);
    res.status(500).json({ success: false, error: (error as Error).message || 'Failed to fetch tiers' });
  }
});

/** GET /api/memberships/my-subscription */
router.get('/my-subscription', requireAuth, async (req, res) => {
  try {
    const subscription = await MembershipService.getUserSubscription(req.user!.id);
    if (!subscription) {
      const tier = await MembershipService.getUserTier(req.user!.id);
      return res.json({
        success: true,
        subscription: null,
        tier: { ...tier, monthly_price: tier.monthly_price / 100, yearly_price: tier.yearly_price / 100 },
      });
    }
    const mt = subscription.membership_tiers as Record<string, unknown>;
    res.json({
      success: true,
      subscription,
      tier: { ...mt, monthly_price: Number(mt.monthly_price ?? mt.price_monthly ?? 0) / 100 },
    });
  } catch (error: unknown) {
    logger.error('Failed to fetch subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/** POST /api/memberships/subscribe */
router.post('/subscribe', requireAuth, paymentLimiter, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tier_id, billing_cycle = 'monthly', gateway = 'paystack', auto_renew = true } = req.body;
    if (!tier_id) return res.status(400).json({ success: false, error: 'Tier ID is required' });

    const tier = await MembershipService.getTierById(tier_id);
    if (tier.id === 'free') {
      return res.status(400).json({ success: false, error: 'Free tier does not require subscription' });
    }

    const amount = billing_cycle === 'yearly' ? tier.yearly_price : tier.monthly_price;
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();
    if (userError || !user) return res.status(404).json({ success: false, error: 'User not found' });

    const reference = `SUB_${tier_id.toUpperCase()}_${uuidv4().substring(0, 8)}_${Date.now()}`;

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'subscription',
        amount,
        currency: 'NGN',
        payment_gateway: gateway,
        reference,
        status: 'pending',
        metadata: { type: 'subscription', tier_id, billing_cycle, auto_renew },
      })
      .select()
      .single();
    if (txError) {
      logger.error('Failed to create transaction:', txError);
      return res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }

    const payment = await PaymentService.initializePayment({
      gateway,
      email: user.email,
      amount,
      reference,
      metadata: { type: 'subscription', tier_id, billing_cycle, auto_renew, user_id: userId, transaction_id: transaction.id },
      callback_url: `${process.env.FRONTEND_URL}/subscription/callback`,
      customer_name: user.full_name,
    });

    res.json({
      success: true,
      transaction_id: transaction.id,
      reference,
      amount: amount / 100,
      authorization_url: ('authorization_url' in payment) ? payment.authorization_url : (payment as { payment_link: string }).payment_link,
    });
  } catch (error: unknown) {
    logger.error('Subscription initialization error:', error);
    res.status(500).json({ success: false, error: (error as Error).message || 'Failed to initialize subscription' });
  }
});

/** POST /api/memberships/cancel */
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const subscription = await MembershipService.cancelSubscription(req.user!.id);
    res.json({ success: true, message: 'Subscription cancelled successfully', subscription });
  } catch (error: unknown) {
    logger.error('Subscription cancellation error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to cancel subscription' });
  }
});

/** POST /api/memberships/change-tier */
router.post('/change-tier', requireAuth, async (req, res) => {
  try {
    const { new_tier_id } = req.body;
    if (!new_tier_id) return res.status(400).json({ success: false, error: 'New tier ID is required' });
    const subscription = await MembershipService.changeSubscriptionTier(req.user!.id, new_tier_id);
    res.json({ success: true, message: 'Subscription tier changed successfully', subscription });
  } catch (error: unknown) {
    logger.error('Tier change error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to change tier' });
  }
});

/** GET /api/memberships/history */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const subscriptions = await MembershipService.getSubscriptionHistory(req.user!.id);
    res.json({ success: true, subscriptions });
  } catch (error: unknown) {
    logger.error('Subscription history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription history' });
  }
});

/** POST /api/memberships/check-limit */
router.post('/check-limit', requireAuth, async (req, res) => {
  try {
    const { limit_type, current_count } = req.body;
    if (!limit_type) return res.status(400).json({ success: false, error: 'Limit type is required' });
    const result = await MembershipService.checkTierLimit({
      userId: req.user!.id,
      limitType: limit_type,
      currentCount: current_count,
    });
    res.json({ success: true, ...result });
  } catch (error: unknown) {
    logger.error('Limit check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check tier limit' });
  }
});

export default router;
