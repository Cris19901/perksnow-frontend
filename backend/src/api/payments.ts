import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimit';
import { PaystackService } from '../services/paystack';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Initialize a payment
 * POST /api/payments/initialize
 */
router.post('/initialize', requireAuth, paymentLimiter, async (req, res) => {
  try {
    const { type, amount, metadata } = req.body;
    const userId = req.user!.id;

    if (!type || !amount) {
      return res.status(400).json({ success: false, error: 'Type and amount are required' });
    }
    if (typeof amount !== 'number' || amount < 100) {
      return res.status(400).json({ success: false, error: 'Minimum amount is ₦1 (100 kobo)' });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    if (userError || !user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const reference = `${type.toUpperCase()}_${uuidv4().substring(0, 8)}_${Date.now()}`;

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type,
        amount,
        currency: 'NGN',
        payment_gateway: 'paystack',
        reference,
        status: 'pending',
        metadata,
      })
      .select()
      .single();
    if (txError) {
      logger.error('Failed to create transaction:', txError);
      return res.status(500).json({ success: false, error: 'Failed to create transaction' });
    }

    const payment = await PaystackService.initializePayment({
      email: user.email,
      amount,
      reference,
      metadata: { ...metadata, user_id: userId, transaction_id: transaction.id, type },
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
    });

    res.json({
      success: true,
      transaction_id: transaction.id,
      reference,
      authorization_url: payment.authorization_url,
      access_code: payment.access_code,
    });
  } catch (error: unknown) {
    logger.error('Payment initialization error:', error);
    res.status(500).json({ success: false, error: (error as Error).message || 'Failed to initialize payment' });
  }
});

/**
 * Verify a payment (client-side callback)
 * GET /api/payments/verify/:reference
 */
router.get('/verify/:reference', requireAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    const userId = req.user!.id;

    // Ensure transaction belongs to this user
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .eq('user_id', userId)
      .single();
    if (txError || !transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // If already completed, skip Paystack call
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        status: 'success',
        amount: transaction.amount / 100,
        reference: transaction.reference,
      });
    }

    const verification = await PaystackService.verifyPayment(reference);
    if (!verification.status) {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    const paymentData = verification.data as Record<string, unknown>;
    const paymentStatus = paymentData.status as string;

    await supabase
      .from('transactions')
      .update({
        status: paymentStatus === 'success' ? 'completed' : 'failed',
        completed_at: paymentStatus === 'success' ? new Date().toISOString() : null,
        gateway_response: paymentData.gateway_response,
        payment_method: paymentData.channel,
      })
      .eq('id', transaction.id);

    res.json({
      success: paymentStatus === 'success',
      status: paymentStatus,
      amount: (paymentData.amount as number) / 100,
      reference: paymentData.reference,
      paid_at: paymentData.paid_at,
    });
  } catch (error: unknown) {
    logger.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: (error as Error).message || 'Failed to verify payment' });
  }
});

/**
 * Payment history
 * GET /api/payments/history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    const type = req.query.type as string | undefined;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) return res.status(500).json({ success: false, error: 'Failed to fetch payment history' });

    res.json({
      success: true,
      transactions: (data ?? []).map((tx: { amount: number }) => ({ ...tx, amount: tx.amount / 100 })),
      count: data?.length ?? 0,
    });
  } catch (error: unknown) {
    logger.error('Payment history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
  }
});

/**
 * Get a single transaction
 * GET /api/payments/transaction/:id
 */
router.get('/transaction/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id)
      .single();
    if (error || !data) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, transaction: { ...data, amount: data.amount / 100 } });
  } catch (error: unknown) {
    logger.error('Transaction fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
});

/**
 * List banks
 * GET /api/payments/banks
 */
router.get('/banks', requireAuth, async (_req, res) => {
  try {
    const result = await PaystackService.listBanks();
    res.json({
      success: true,
      banks: result.banks.map((b) => ({ name: b.name, code: b.code, slug: b.slug })),
    });
  } catch (error: unknown) {
    logger.error('Banks fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch banks' });
  }
});

/**
 * Verify a bank account
 * POST /api/payments/verify-account
 */
router.post('/verify-account', requireAuth, async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;
    if (!account_number || !bank_code) {
      return res.status(400).json({ success: false, error: 'Account number and bank code are required' });
    }
    const result = await PaystackService.resolveAccountNumber({ account_number, bank_code });
    res.json({ success: true, account_name: result.account_name, account_number: result.account_number });
  } catch (error: unknown) {
    logger.error('Account verification error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to verify account' });
  }
});

export default router;
