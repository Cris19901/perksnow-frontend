import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabase';
import { PaymentService, Gateway } from './payment';
import { logger } from '../utils/logger';

const MIN_WITHDRAWAL_KOBO = 100_000; // ₦1,000

export class WithdrawalService {
  static async addBankAccount(params: {
    userId: string;
    accountNumber: string;
    bankCode: string;
    accountName: string;
    gateway?: Gateway;
  }) {
    const { userId, accountNumber, bankCode, accountName, gateway = 'paystack' } = params;
    logger.info(`Adding bank account for user ${userId}: ${accountNumber}`);

    const verification = await PaymentService.resolveAccount({ gateway, account_number: accountNumber, bank_code: bankCode });
    if (!verification.success) throw new Error('Failed to verify bank account');

    // Return existing account rather than duplicating
    const { data: existing } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('account_number', accountNumber)
      .eq('bank_code', bankCode)
      .maybeSingle();
    if (existing) return { success: true, account: existing, message: 'Bank account already exists' };

    const { data: account, error } = await supabase
      .from('bank_accounts')
      .insert({ user_id: userId, account_number: accountNumber, account_name: accountName, bank_code: bankCode, is_verified: true })
      .select()
      .single();
    if (error) throw new Error('Failed to add bank account');

    logger.info(`Bank account added for user ${userId}`);
    return { success: true, account };
  }

  static async getBankAccounts(userId: string) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch bank accounts');
    return data ?? [];
  }

  static async setPrimaryBankAccount(userId: string, accountId: string) {
    // Unset existing primary
    await supabase.from('bank_accounts').update({ is_primary: false }).eq('user_id', userId);
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ is_primary: true })
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error('Failed to set primary bank account');
    return data;
  }

  static async requestWithdrawal(params: {
    userId: string;
    amount: number; // kobo
    bankAccountId: string;
    gateway?: Gateway;
  }) {
    const { userId, amount, bankAccountId, gateway = 'paystack' } = params;
    logger.info(`Withdrawal requested: User ${userId}, Amount ₦${amount / 100}`);

    if (amount < MIN_WITHDRAWAL_KOBO) {
      throw new Error(`Minimum withdrawal amount is ₦${MIN_WITHDRAWAL_KOBO / 100}`);
    }

    // Check withdrawal eligibility via RPC
    const { data: eligibility, error: eligError } = await supabase.rpc('can_user_withdraw', {
      p_user_id: userId,
    });
    if (eligError) logger.warn('can_user_withdraw RPC error (proceeding anyway):', eligError);
    if (eligibility === false) throw new Error('You are not eligible to withdraw at this time');

    // Verify bank account belongs to user
    const { data: bankAccount, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .eq('user_id', userId)
      .single();
    if (bankError || !bankAccount) throw new Error('Bank account not found');

    // Verify sufficient balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();
    if (!wallet || wallet.balance < amount) throw new Error('Insufficient balance');

    const reference = `WTD_${uuidv4().substring(0, 8)}_${Date.now()}`;

    // Deduct from wallet atomically before creating the record
    const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: userId,
      p_amount: -amount,
    });
    if (walletError) throw new Error('Failed to process withdrawal');

    const { data: withdrawal, error: wErr } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount,
        bank_account_id: bankAccountId,
        payment_gateway: gateway,
        reference,
        status: 'pending',
      })
      .select()
      .single();

    if (wErr) {
      // Rollback wallet deduction
      await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: amount });
      logger.error('Failed to create withdrawal record, wallet refunded:', wErr);
      throw new Error('Failed to create withdrawal request');
    }

    logger.info(`Withdrawal created: ${reference}`);
    return { success: true, withdrawal };
  }

  static async processWithdrawal(withdrawalId: string) {
    logger.info(`Processing withdrawal: ${withdrawalId}`);

    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select('*, bank_accounts(*)')
      .eq('id', withdrawalId)
      .single();
    if (error || !withdrawal) throw new Error('Withdrawal not found');
    if (withdrawal.status !== 'pending') throw new Error(`Withdrawal is already ${withdrawal.status}`);

    await supabase.from('withdrawals').update({ status: 'processing' }).eq('id', withdrawalId);

    try {
      await PaymentService.initiateTransfer({
        gateway: withdrawal.payment_gateway ?? 'paystack',
        amount: withdrawal.amount,
        account_number: withdrawal.bank_accounts.account_number,
        bank_code: withdrawal.bank_accounts.bank_code,
        account_name: withdrawal.bank_accounts.account_name,
        reference: withdrawal.reference,
        narration: `LavLay withdrawal to ${withdrawal.bank_accounts.account_name}`,
      });
      return { success: true, withdrawal_id: withdrawalId, status: 'processing' };
    } catch (err) {
      logger.error(`Failed to process withdrawal ${withdrawalId}:`, err);
      await supabase
        .from('withdrawals')
        .update({ status: 'failed', gateway_response: (err as Error).message })
        .eq('id', withdrawalId);
      await supabase.rpc('increment_wallet_balance', { p_user_id: withdrawal.user_id, p_amount: withdrawal.amount });
      throw err;
    }
  }

  static async getWithdrawalHistory(params: {
    userId: string;
    limit?: number;
    offset?: number;
    status?: string;
  }) {
    const { userId, limit = 20, offset = 0, status } = params;
    let query = supabase
      .from('withdrawals')
      .select('*, bank_accounts(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch withdrawal history');
    return (data ?? []).map((w: { amount: number }) => ({ ...w, amount: w.amount / 100 }));
  }

  /**
   * Cancel a pending withdrawal and refund the balance.
   * Uses status 'cancelled' (not 'failed') to distinguish user-initiated cancellations.
   */
  static async cancelWithdrawal(userId: string, withdrawalId: string) {
    const { data: withdrawal, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .eq('user_id', userId)
      .single();
    if (error || !withdrawal) throw new Error('Withdrawal not found');
    if (withdrawal.status !== 'pending') throw new Error('Only pending withdrawals can be cancelled');

    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({ status: 'cancelled', gateway_response: 'Cancelled by user' })
      .eq('id', withdrawalId);
    if (updateError) throw new Error('Failed to cancel withdrawal');

    await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: withdrawal.amount });
    logger.info(`Withdrawal cancelled and refunded: ${withdrawalId}`);
    return { success: true, message: 'Withdrawal cancelled and amount refunded' };
  }

  static async getPendingWithdrawals() {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) {
      logger.error('Failed to fetch pending withdrawals:', error);
      return [];
    }
    return data ?? [];
  }
}
