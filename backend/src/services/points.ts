import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

export class PointsService {
  static async awardPoints(params: {
    userId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }) {
    const { userId, action, metadata } = params;

    const { data: reward, error: rewardError } = await supabase
      .from('points_rewards')
      .select('*')
      .eq('activity', action)
      .maybeSingle();
    if (rewardError || !reward) {
      logger.warn(`No points reward configured for action: ${action}`);
      return null;
    }

    // Check daily cap with a count-only query (no row data needed)
    if (reward.max_per_day) {
      const todayStart = new Date().toISOString().split('T')[0];
      const { count, error: countErr } = await supabase
        .from('points_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('activity', action)
        .gte('created_at', todayStart);
      if (!countErr && count !== null && count >= reward.max_per_day) {
        logger.info(`Daily points limit reached for ${action}: user ${userId}`);
        return { success: false, reason: 'Daily limit reached', daily_limit: reward.max_per_day };
      }
    }

    const { error } = await supabase.rpc('award_points', {
      p_user_id: userId,
      p_action: action,
      p_points: reward.points,
      p_metadata: metadata ?? null,
    });
    if (error) {
      logger.error('Failed to award points:', error);
      throw new Error('Failed to award points');
    }

    logger.info(`Awarded ${reward.points} points to user ${userId} for ${action}`);
    return { success: true, points: reward.points as number, action };
  }

  static async getBalance(userId: string) {
    const { data, error } = await supabase
      .from('points_balance')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return { balance: 0 };
    return { balance: data.balance as number };
  }

  static async getHistory(params: {
    userId: string;
    limit?: number;
    offset?: number;
    action?: string;
  }) {
    const { userId, limit = 20, offset = 0, action } = params;
    let query = supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (action) query = query.eq('activity', action);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch points history');
    return data ?? [];
  }

  static async convertPointsToMoney(params: { userId: string; points: number }) {
    const { userId, points } = params;
    logger.info(`Converting ${points} points to money for user ${userId}`);

    if (points < 100) throw new Error('Minimum 100 points required for conversion');

    const balance = await this.getBalance(userId);
    if (balance.balance < points) throw new Error('Insufficient points balance');

    const { data, error } = await supabase.rpc('convert_points_to_money', {
      p_user_id: userId,
      p_points: points,
    });
    if (error) throw new Error(error.message || 'Failed to convert points to money');

    const moneyAmount = data as number; // in kobo
    logger.info(`Converted ${points} points to ₦${moneyAmount / 100} for user ${userId}`);
    return {
      success: true,
      points_converted: points,
      money_earned: moneyAmount / 100,
      money_earned_kobo: moneyAmount,
    };
  }

  /** Aggregate analytics using DB-level sums instead of loading all transactions */
  static async getAnalytics(userId: string) {
    const [balance, earned, spent] = await Promise.all([
      this.getBalance(userId),
      // Total earned (positive only)
      supabase.rpc('get_user_points_earned', { p_user_id: userId }).then(
        ({ data }) => (data as number) ?? 0
      ),
      // Total spent (conversions)
      supabase
        .from('points_transactions')
        .select('points')
        .eq('user_id', userId)
        .eq('activity', 'points_converted')
        .then(({ data }) =>
          Math.abs(
            (data ?? []).reduce((s: number, t: { points: number }) => s + t.points, 0)
          )
        ),
    ]);

    // Per-activity breakdown
    const { data: txns } = await supabase
      .from('points_transactions')
      .select('activity, points')
      .eq('user_id', userId)
      .gt('points', 0);

    const breakdown: Record<string, { points: number; count: number }> = {};
    (txns ?? []).forEach((t: { activity: string; points: number }) => {
      if (!breakdown[t.activity]) breakdown[t.activity] = { points: 0, count: 0 };
      breakdown[t.activity].points += t.points;
      breakdown[t.activity].count += 1;
    });

    return {
      current_balance: balance.balance,
      money_value: balance.balance / 100,
      total_earned: earned,
      total_spent: spent,
      breakdown,
    };
  }

  static async getAvailableRewards() {
    const { data, error } = await supabase
      .from('points_rewards')
      .select('*')
      .order('points', { ascending: false });
    if (error) throw new Error('Failed to fetch points rewards');
    return data ?? [];
  }

  static async awardDailyLogin(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data: existing } = await supabase
      .from('points_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('activity', 'daily_login')
      .gte('created_at', today)
      .limit(1);
    if (existing) return { success: false, reason: 'Already awarded today' };

    return this.awardPoints({ userId, action: 'daily_login', metadata: { date: today } });
  }
}
