import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

export class EarningsService {
  /** Record earnings for a user after a transaction */
  static async recordEarnings(params: {
    userId: string;
    type: string;
    grossAmount: number; // kobo
    reference: string;
    metadata?: Record<string, unknown>;
  }) {
    const { userId, type, grossAmount, reference, metadata } = params;
    logger.info(`Recording earnings for user ${userId}: ${type} - ₦${grossAmount / 100}`);

    const { data: revenueConfig } = await supabase
      .from('revenue_config')
      .select('platform_percentage, user_percentage')
      .eq('category', type)
      .maybeSingle();

    const platformFee = revenueConfig
      ? Math.floor((grossAmount * revenueConfig.platform_percentage) / 100)
      : 0;
    const userEarnings = revenueConfig
      ? Math.floor((grossAmount * revenueConfig.user_percentage) / 100)
      : grossAmount;

    const { data: earning, error } = await supabase
      .from('earnings')
      .insert({ user_id: userId, type, amount: userEarnings, platform_fee: platformFee, reference, metadata })
      .select()
      .single();
    if (error) {
      logger.error('Failed to record earnings:', error);
      throw new Error('Failed to record earnings');
    }

    const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
      p_user_id: userId,
      p_amount: userEarnings,
    });
    if (walletError) throw new Error('Failed to update wallet balance');

    logger.info(
      `Earnings recorded: User ${userId} earned ₦${userEarnings / 100}, platform fee ₦${platformFee / 100}`
    );
    return earning;
  }

  /** Use a single DB aggregation instead of loading all rows */
  static async getTotalEarnings(userId: string) {
    const { data, error } = await supabase.rpc('get_user_total_earnings', { p_user_id: userId });
    if (error) {
      logger.error('Failed to fetch total earnings via RPC, falling back:', error);
      // Fallback: count in JS
      const { data: rows, error: rowErr } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', userId);
      if (rowErr) throw new Error('Failed to fetch earnings');
      const total = (rows ?? []).reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
      return { total: total / 100, total_kobo: total, count: rows?.length ?? 0 };
    }
    const total: number = data ?? 0;
    return { total: total / 100, total_kobo: total };
  }

  /** Breakdown by type using a single query with grouping */
  static async getEarningsBreakdown(userId: string) {
    const { data, error } = await supabase
      .from('earnings')
      .select('type, amount')
      .eq('user_id', userId);
    if (error) throw new Error('Failed to fetch earnings breakdown');

    const breakdown: Record<string, { amount: number; count: number }> = {};
    (data ?? []).forEach((e: { type: string; amount: number }) => {
      if (!breakdown[e.type]) breakdown[e.type] = { amount: 0, count: 0 };
      breakdown[e.type].amount += e.amount;
      breakdown[e.type].count += 1;
    });
    Object.keys(breakdown).forEach((t) => {
      breakdown[t].amount = breakdown[t].amount / 100;
    });
    return breakdown;
  }

  static async getEarningsHistory(params: {
    userId: string;
    limit?: number;
    offset?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { userId, limit = 20, offset = 0, type, startDate, endDate } = params;
    let query = supabase
      .from('earnings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (type) query = query.eq('type', type);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch earnings history');
    return (data ?? []).map((e: { amount: number; platform_fee: number }) => ({
      ...e,
      amount: e.amount / 100,
      platform_fee: e.platform_fee / 100,
    }));
  }

  static async getWalletBalance(userId: string) {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return { balance: 0, balance_kobo: 0 };
    return { balance: data.balance / 100, balance_kobo: data.balance };
  }

  static async getEarningsAnalytics(userId: string) {
    const [totalEarnings, breakdown, walletBalance] = await Promise.all([
      this.getTotalEarnings(userId),
      this.getEarningsBreakdown(userId),
      this.getWalletBalance(userId),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentEarnings } = await supabase
      .from('earnings')
      .select('amount, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const dailyEarnings: Record<string, number> = {};
    (recentEarnings ?? []).forEach((e: { amount: number; created_at: string }) => {
      const date = e.created_at.split('T')[0];
      dailyEarnings[date] = (dailyEarnings[date] ?? 0) + e.amount;
    });

    const { data: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('user_id', userId)
      .in('status', ['pending', 'processing']);

    const pendingAmount = (pendingWithdrawals ?? []).reduce(
      (sum: number, w: { amount: number }) => sum + w.amount,
      0
    );

    return {
      total_earnings: totalEarnings,
      breakdown,
      wallet: {
        ...walletBalance,
        pending_withdrawals: pendingAmount / 100,
        available_for_withdrawal: (walletBalance.balance_kobo - pendingAmount) / 100,
      },
      recent_trend: Object.entries(dailyEarnings).map(([date, amount]) => ({
        date,
        amount: amount / 100,
      })),
    };
  }
}
