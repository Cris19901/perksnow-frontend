import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * Get all subscription plans
 * GET /api/subscriptions/plans
 */
router.get('/plans', async (req, res) => {
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    res.json({
      success: true,
      plans: plans.map((plan) => ({
        ...plan,
        price_monthly: Number(plan.price_monthly),
        price_yearly: Number(plan.price_yearly),
      })),
    });
  } catch (error: any) {
    logger.error('Failed to fetch subscription plans:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription plans'
    });
  }
});

/**
 * Get user's current subscription
 * GET /api/subscriptions/my-subscription
 */
router.get('/my-subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get user details with subscription info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', user.subscription_tier)
      .single();

    if (planError) throw planError;

    // Get active subscription record
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({
      success: true,
      subscription: {
        tier: user.subscription_tier,
        status: user.subscription_status,
        expires_at: user.subscription_expires_at,
        plan: {
          ...plan,
          price_monthly: Number(plan.price_monthly),
          price_yearly: Number(plan.price_yearly),
        },
        active_subscription: subscription,
      },
    });
  } catch (error: any) {
    logger.error('Failed to fetch user subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch subscription'
    });
  }
});

/**
 * Subscribe to a plan (initialize payment)
 * POST /api/subscriptions/subscribe
 */
router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      plan_id,
      billing_cycle = 'monthly',
      provider = 'paystack'
    } = req.body;

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    // Can't subscribe to free tier
    if (plan.name === 'free') {
      return res.status(400).json({
        success: false,
        error: 'Free tier does not require subscription'
      });
    }

    // Calculate amount based on billing cycle
    const amount = billing_cycle === 'yearly'
      ? Number(plan.price_yearly)
      : Number(plan.price_monthly);

    // Get user email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate unique reference
    const reference = `SUB_${plan.name.toUpperCase()}_${uuidv4().substring(0, 8)}_${Date.now()}`;

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        plan_name: plan.name,
        status: 'pending',
        billing_cycle,
        amount,
        currency: plan.currency,
        payment_provider: provider,
        payment_reference: reference,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (subError) {
      logger.error('Failed to create subscription:', subError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create subscription'
      });
    }

    // Create payment transaction record
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        provider,
        reference,
        amount,
        currency: plan.currency,
        status: 'pending',
        metadata: {
          plan_id,
          plan_name: plan.name,
          billing_cycle,
          user_email: user.email,
          user_name: user.full_name,
        },
      })
      .select()
      .single();

    if (txError) {
      logger.error('Failed to create payment transaction:', txError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment transaction'
      });
    }

    // Initialize payment based on provider
    let paymentUrl: string;

    if (provider === 'paystack') {
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          amount: amount * 100, // Paystack expects amount in kobo
          reference,
          callback_url: `${process.env.FRONTEND_URL}/subscription/callback`,
          metadata: {
            subscription_id: subscription.id,
            plan_name: plan.name,
            billing_cycle,
          },
        }),
      });

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        logger.error('Paystack initialization failed:', paystackData);
        return res.status(500).json({
          success: false,
          error: 'Payment initialization failed'
        });
      }

      paymentUrl = paystackData.data.authorization_url;
    } else if (provider === 'flutterwave') {
      const flutterwaveResponse = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: reference,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.FRONTEND_URL}/subscription/callback`,
          customer: {
            email: user.email,
            name: user.full_name,
          },
          customizations: {
            title: 'LavLay Pro Subscription',
            description: `${plan.display_name} - ${billing_cycle}`,
          },
          meta: {
            subscription_id: subscription.id,
            plan_name: plan.name,
            billing_cycle,
          },
        }),
      });

      const flutterwaveData = await flutterwaveResponse.json();

      if (flutterwaveData.status !== 'success') {
        logger.error('Flutterwave initialization failed:', flutterwaveData);
        return res.status(500).json({
          success: false,
          error: 'Payment initialization failed'
        });
      }

      paymentUrl = flutterwaveData.data.link;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported payment provider'
      });
    }

    // Update subscription with payment URL
    await supabase
      .from('subscriptions')
      .update({ payment_url: paymentUrl })
      .eq('id', subscription.id);

    res.json({
      success: true,
      subscription_id: subscription.id,
      reference,
      amount,
      payment_url: paymentUrl,
    });
  } catch (error: any) {
    logger.error('Subscription initialization error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initialize subscription'
    });
  }
});

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 */
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Call the Supabase function
    const { data, error } = await supabase.rpc('cancel_subscription', {
      p_user_id: userId,
    });

    if (error) throw error;

    res.json({
      success: true,
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
    });
  } catch (error: any) {
    logger.error('Subscription cancellation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel subscription'
    });
  }
});

/**
 * Get subscription history
 * GET /api/subscriptions/history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (
          name,
          display_name,
          price_monthly,
          price_yearly,
          currency
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      subscriptions,
    });
  } catch (error: any) {
    logger.error('Subscription history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history'
    });
  }
});

/**
 * Check if user can withdraw
 * GET /api/subscriptions/can-withdraw
 */
router.get('/can-withdraw', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase.rpc('can_user_withdraw', {
      p_user_id: userId,
    });

    if (error) throw error;

    res.json({
      success: true,
      can_withdraw: data,
    });
  } catch (error: any) {
    logger.error('Withdrawal check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check withdrawal eligibility'
    });
  }
});

export default router;
