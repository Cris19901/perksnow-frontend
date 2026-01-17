import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

/**
 * Verify Paystack webhook signature
 */
export const verifyPaystackSignature = (req: Request): boolean => {
  const hash = crypto
    .createHmac('sha512', config.paystack.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return hash === req.headers['x-paystack-signature'];
};

/**
 * Handle Paystack webhook events
 */
export const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    // Verify signature
    if (!verifyPaystackSignature(req)) {
      logger.warn('Invalid Paystack webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    logger.info(`Paystack webhook received: ${event.event}`);

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;

      case 'transfer.reversed':
        await handleTransferReversed(event.data);
        break;

      default:
        logger.info(`Unhandled Paystack event: ${event.event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Paystack webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful payment
 */
async function handleChargeSuccess(data: any) {
  const reference = data.reference;
  const amount = data.amount; // in kobo
  const metadata = data.metadata;

  logger.info(`Processing successful charge: ${reference}`);

  // Find the payment transaction
  const { data: transaction, error: fetchError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('reference', reference)
    .single();

  if (fetchError || !transaction) {
    logger.error(`Payment transaction not found: ${reference}`);
    return;
  }

  // Update payment transaction status
  const { error: updateError } = await supabase
    .from('payment_transactions')
    .update({
      status: 'success',
      provider_response: data,
      webhook_data: data,
      webhook_received_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);

  if (updateError) {
    logger.error('Failed to update payment transaction:', updateError);
    return;
  }

  // Process based on transaction type
  if (transaction.subscription_id) {
    // This is a subscription payment
    await activateSubscription(transaction.subscription_id, reference);
  } else if (metadata?.type === 'product_purchase') {
    await processProductPurchase(transaction, metadata);
  } else if (metadata?.type === 'wallet_topup') {
    await processWalletTopup(transaction);
  }
}

/**
 * Activate subscription after successful payment
 */
async function activateSubscription(subscriptionId: string, paymentReference: string) {
  logger.info(`Activating subscription: ${subscriptionId}`);

  try {
    // Call the Supabase function to activate subscription
    const { data, error } = await supabase.rpc('activate_subscription', {
      p_subscription_id: subscriptionId,
      p_payment_reference: paymentReference,
    });

    if (error) {
      logger.error('Failed to activate subscription:', error);
      return;
    }

    logger.info(`Subscription activated successfully: ${subscriptionId}`);

    // Get subscription details for user notification
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('user_id, plan_name, expires_at')
      .eq('id', subscriptionId)
      .single();

    if (subscription) {
      logger.info(
        `User ${subscription.user_id} upgraded to ${subscription.plan_name} until ${subscription.expires_at}`
      );

      // TODO: Send email notification to user
      // await sendSubscriptionActivatedEmail(subscription.user_id, subscription);
    }
  } catch (error) {
    logger.error('Subscription activation error:', error);
  }
}

/**
 * Process product purchase
 */
async function processProductPurchase(transaction: any, metadata: any) {
  const productId = metadata.product_id;
  const sellerId = metadata.seller_id;
  const buyerId = transaction.user_id;
  const amount = transaction.amount;

  logger.info(`Processing product purchase: ${productId}`);

  // Get revenue config
  const { data: revenueConfig } = await supabase
    .from('revenue_config')
    .select('*')
    .eq('category', 'product_sale')
    .single();

  if (!revenueConfig) {
    logger.error('Revenue config not found');
    return;
  }

  // Calculate platform fee and seller earnings
  const platformFee = (amount * revenueConfig.platform_percentage) / 100;
  const sellerEarnings = (amount * revenueConfig.user_percentage) / 100;

  // Create earnings record for seller
  const { error: earningsError } = await supabase.from('earnings').insert({
    user_id: sellerId,
    type: 'product_sale',
    amount: sellerEarnings,
    platform_fee: platformFee,
    reference: transaction.reference,
    metadata: {
      product_id: productId,
      buyer_id: buyerId,
      transaction_id: transaction.id,
    },
  });

  if (earningsError) {
    logger.error('Failed to create earnings:', earningsError);
    return;
  }

  // Update seller's wallet
  const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
    p_user_id: sellerId,
    p_amount: sellerEarnings,
  });

  if (walletError) {
    logger.error('Failed to update wallet:', walletError);
  }

  logger.info(`Product purchase processed: Seller earned ₦${sellerEarnings / 100}`);
}

/**
 * Process wallet top-up
 */
async function processWalletTopup(transaction: any) {
  const userId = transaction.user_id;
  const amount = transaction.amount;

  logger.info(`Processing wallet topup for user ${userId}: ₦${amount / 100}`);

  const { error } = await supabase.rpc('increment_wallet_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    logger.error('Failed to update wallet:', error);
  } else {
    logger.info(`Wallet topped up: User ${userId} + ₦${amount / 100}`);
  }
}

/**
 * Handle successful transfer (withdrawal)
 */
async function handleTransferSuccess(data: any) {
  const reference = data.reference;

  logger.info(`Processing successful transfer: ${reference}`);

  const { error } = await supabase
    .from('withdrawals')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      gateway_response: data.reason || 'Transfer successful',
    })
    .eq('reference', reference);

  if (error) {
    logger.error('Failed to update withdrawal:', error);
  } else {
    logger.info(`Withdrawal completed: ${reference}`);
  }
}

/**
 * Handle failed transfer
 */
async function handleTransferFailed(data: any) {
  const reference = data.reference;

  logger.info(`Processing failed transfer: ${reference}`);

  // Update withdrawal status
  const { data: withdrawal, error: fetchError } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('reference', reference)
    .single();

  if (fetchError || !withdrawal) {
    logger.error(`Withdrawal not found: ${reference}`);
    return;
  }

  // Mark as failed
  const { error: updateError } = await supabase
    .from('withdrawals')
    .update({
      status: 'failed',
      gateway_response: data.reason || 'Transfer failed',
    })
    .eq('id', withdrawal.id);

  if (updateError) {
    logger.error('Failed to update withdrawal:', updateError);
    return;
  }

  // Refund to wallet
  const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
    p_user_id: withdrawal.user_id,
    p_amount: withdrawal.amount,
  });

  if (walletError) {
    logger.error('Failed to refund wallet:', walletError);
  } else {
    logger.info(`Withdrawal failed, amount refunded: ₦${withdrawal.amount / 100}`);
  }
}

/**
 * Handle reversed transfer
 */
async function handleTransferReversed(data: any) {
  const reference = data.reference;

  logger.info(`Processing reversed transfer: ${reference}`);

  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('reference', reference)
    .single();

  if (withdrawal) {
    await supabase
      .from('withdrawals')
      .update({
        status: 'reversed',
        gateway_response: 'Transfer reversed',
      })
      .eq('id', withdrawal.id);

    // Refund to wallet
    await supabase.rpc('increment_wallet_balance', {
      p_user_id: withdrawal.user_id,
      p_amount: withdrawal.amount,
    });

    logger.info(`Transfer reversed, amount refunded: ₦${withdrawal.amount / 100}`);
  }
}
