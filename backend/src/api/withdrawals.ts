import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { withdrawalLimiter } from '../middleware/rateLimit';
import { WithdrawalService } from '../services/withdrawal';
import { PaymentService } from '../services/payment';
import { logger } from '../utils/logger';

const router = Router();

/** GET /api/withdrawals/banks */
router.get('/banks', requireAuth, async (req, res) => {
  try {
    const gateway = (req.query.gateway as 'paystack' | 'flutterwave') ?? 'paystack';
    const result = await PaymentService.listBanks(gateway);
    res.json({ success: true, banks: result.banks });
  } catch (error: unknown) {
    logger.error('Failed to fetch banks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch banks' });
  }
});

/** POST /api/withdrawals/verify-account */
router.post('/verify-account', requireAuth, async (req, res) => {
  try {
    const { account_number, bank_code, gateway = 'paystack' } = req.body;
    if (!account_number || !bank_code) {
      return res.status(400).json({ success: false, error: 'Account number and bank code are required' });
    }
    const result = await PaymentService.resolveAccount({ gateway, account_number, bank_code });
    res.json(result);
  } catch (error: unknown) {
    logger.error('Account verification error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to verify account' });
  }
});

/** POST /api/withdrawals/add-bank-account */
router.post('/add-bank-account', requireAuth, async (req, res) => {
  try {
    const { account_number, bank_code, account_name, gateway } = req.body;
    if (!account_number || !bank_code || !account_name) {
      return res.status(400).json({ success: false, error: 'Account number, bank code, and account name are required' });
    }
    const result = await WithdrawalService.addBankAccount({
      userId: req.user!.id,
      accountNumber: account_number,
      bankCode: bank_code,
      accountName: account_name,
      gateway,
    });
    res.json(result);
  } catch (error: unknown) {
    logger.error('Add bank account error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to add bank account' });
  }
});

/** GET /api/withdrawals/bank-accounts */
router.get('/bank-accounts', requireAuth, async (req, res) => {
  try {
    const accounts = await WithdrawalService.getBankAccounts(req.user!.id);
    res.json({ success: true, accounts });
  } catch (error: unknown) {
    logger.error('Failed to fetch bank accounts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch bank accounts' });
  }
});

/** POST /api/withdrawals/set-primary */
router.post('/set-primary', requireAuth, async (req, res) => {
  try {
    const { account_id } = req.body;
    if (!account_id) return res.status(400).json({ success: false, error: 'Account ID is required' });
    const account = await WithdrawalService.setPrimaryBankAccount(req.user!.id, account_id);
    res.json({ success: true, account });
  } catch (error: unknown) {
    logger.error('Set primary account error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to set primary account' });
  }
});

/** POST /api/withdrawals/request */
router.post('/request', requireAuth, withdrawalLimiter, async (req, res) => {
  try {
    const { amount, bank_account_id, gateway } = req.body;
    if (!amount || !bank_account_id) {
      return res.status(400).json({ success: false, error: 'Amount and bank account are required' });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    // Convert naira to kobo
    const amountInKobo = Math.floor(amount * 100);
    const result = await WithdrawalService.requestWithdrawal({
      userId: req.user!.id,
      amount: amountInKobo,
      bankAccountId: bank_account_id,
      gateway,
    });
    res.json(result);
  } catch (error: unknown) {
    logger.error('Withdrawal request error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to request withdrawal' });
  }
});

/** GET /api/withdrawals/history */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Number(req.query.offset ?? 0);
    const withdrawals = await WithdrawalService.getWithdrawalHistory({
      userId: req.user!.id,
      limit,
      offset,
      status: req.query.status as string | undefined,
    });
    res.json({ success: true, withdrawals, count: withdrawals.length });
  } catch (error: unknown) {
    logger.error('Withdrawal history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawal history' });
  }
});

/** POST /api/withdrawals/cancel/:id */
router.post('/cancel/:id', requireAuth, async (req, res) => {
  try {
    const result = await WithdrawalService.cancelWithdrawal(req.user!.id, req.params.id);
    res.json(result);
  } catch (error: unknown) {
    logger.error('Withdrawal cancellation error:', error);
    res.status(400).json({ success: false, error: (error as Error).message || 'Failed to cancel withdrawal' });
  }
});

export default router;
