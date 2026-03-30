import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

interface Tier {
  id: string;
  name: string;
  display_name: string;
  monthly_price: number;
  yearly_price: number;
  price_monthly?: number;
  price_yearly?: number;
  duration_months?: number;
  max_products?: number | null;
  max_posts_per_day?: number | null;
  can_verify?: boolean;
  storage_limit_gb?: number | null;
  [key: string]: unknown;
}

function normalizeTier(tier: Record<string, unknown>): Tier {
  if (!tier) throw new Error('Invalid membership tier data');
  const monthly = Number(tier.monthly_price ?? tier.price_monthly ?? 0);
  const yearly = Number(tier.yearly_price ?? tier.price_yearly ?? 0);
  return { ...tier, monthly_price: monthly, yearly_price: yearly } as Tier;
}

export class MembershipService {
  static async getTiers(): Promise<Tier[]> {
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });
    if (error) {
      logger.error('Failed to fetch membership tiers:', error);
      throw new Error('Failed to fetch membership tiers');
    }
    return (data ?? []).map(normalizeTier);
  }

  static async getTierById(tierId: string): Promise<Tier> {
    const { data, error } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', tierId)
      .single();
    if (error) {
      logger.error(`Failed to fetch tier ${tierId}:`, error);
      throw new Error('Tier not found');
    }
    return normalizeTier(data);
  }

  static async getUserSubscription(userId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, membership_tiers(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      logger.error('Failed to fetch user subscription:', error);
      return null;
    }
    return data;
  }

  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const sub = await this.getUserSubscription(userId);
    return sub !== null;
  }

  static async getUserTier(userId: string): Promise<Tier> {
    const subscription = await this.getUserSubscription(userId);
    if (subscription?.membership_tiers) {
      return normalizeTier(subscription.membership_tiers as Record<string, unknown>);
    }
    const { data: freeTier } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('id', 'free')
      .single();
    return normalizeTier(freeTier);
  }

  static async createSubscription(params: {
    userId: string;
    tierId: string;
    paymentMethod: string;
    autoRenew?: boolean;
  }) {
    const { userId, tierId, paymentMethod, autoRenew = true } = params;
    const tier = await this.getTierById(tierId);
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + (tier.duration_months ?? 1));

    const existing = await this.getUserSubscription(userId);

    if (existing) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          tier_id: tierId,
          status: 'active',
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          auto_renew: autoRenew,
          payment_method: paymentMethod,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error('Failed to update subscription');
      logger.info(`Subscription updated for user ${userId} to tier ${tierId}`);
      return data;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier_id: tierId,
        status: 'active',
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        auto_renew: autoRenew,
        payment_method: paymentMethod,
      })
      .select()
      .single();
    if (error) throw new Error('Failed to create subscription');
    logger.info(`Subscription created for user ${userId} to tier ${tierId}`);
    return data;
  }

  static async cancelSubscription(userId: string) {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) throw new Error('No active subscription found');

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
      .select()
      .single();
    if (error) throw new Error('Failed to cancel subscription');
    logger.info(`Subscription cancelled for user ${userId}`);
    return data;
  }

  static async changeSubscriptionTier(userId: string, newTierId: string) {
    const currentSub = await this.getUserSubscription(userId);
    if (!currentSub) throw new Error('No active subscription to change');

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ tier_id: newTierId, updated_at: new Date().toISOString() })
      .eq('id', currentSub.id)
      .select('*, membership_tiers(*)')
      .single();
    if (error) throw new Error('Failed to change subscription tier');
    logger.info(`Subscription tier changed for user ${userId} to ${newTierId}`);
    return data;
  }

  static async getSubscriptionHistory(userId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, membership_tiers(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('Failed to fetch subscription history');
    return (data ?? []).map((sub) => {
      if (sub.membership_tiers) {
        sub.membership_tiers = normalizeTier(sub.membership_tiers as Record<string, unknown>);
      }
      return sub;
    });
  }

  static async checkTierLimit(params: {
    userId: string;
    limitType: string;
    currentCount?: number;
  }) {
    const tier = await this.getUserTier(params.userId);
    switch (params.limitType) {
      case 'products':
        if (tier.max_products === null || tier.max_products === undefined) return { allowed: true };
        if (params.currentCount !== undefined && params.currentCount >= tier.max_products) {
          return {
            allowed: false,
            reason: `Your ${tier.name} plan allows max ${tier.max_products} products. Upgrade to list more.`,
          };
        }
        return { allowed: true };
      case 'posts_per_day':
        if (tier.max_posts_per_day === null || tier.max_posts_per_day === undefined) return { allowed: true };
        if (params.currentCount !== undefined && params.currentCount >= tier.max_posts_per_day) {
          return {
            allowed: false,
            reason: `Your ${tier.name} plan allows ${tier.max_posts_per_day} posts per day. Upgrade for unlimited posts.`,
          };
        }
        return { allowed: true };
      case 'verification':
        if (!tier.can_verify) {
          return { allowed: false, reason: 'Verification badge requires a paid plan.' };
        }
        return { allowed: true };
      case 'storage_gb':
        if (tier.storage_limit_gb === null || tier.storage_limit_gb === undefined) return { allowed: true };
        if (params.currentCount !== undefined && params.currentCount >= (tier.storage_limit_gb as number)) {
          return {
            allowed: false,
            reason: `Your ${tier.name} plan allows ${tier.storage_limit_gb}GB storage. Upgrade for more space.`,
          };
        }
        return { allowed: true };
      default:
        return { allowed: true };
    }
  }

  /** Called by the expiry cron job */
  static async processExpiredSubscriptions() {
    const { data: expired, error } = await supabase
      .from('subscriptions')
      .select('id, user_id, auto_renew')
      .eq('status', 'active')
      .lt('ends_at', new Date().toISOString());
    if (error) {
      logger.error('Failed to fetch expired subscriptions:', error);
      return;
    }
    logger.info(`Processing ${expired?.length ?? 0} expired subscriptions`);
    for (const sub of expired ?? []) {
      if (sub.auto_renew) {
        logger.info(`Auto-renew queued for subscription ${sub.id}`);
        // TODO: queue renewal job
      } else {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        logger.info(`Subscription ${sub.id} marked as expired`);
      }
    }
  }
}
