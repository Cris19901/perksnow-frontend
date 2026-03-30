import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

function verifySignature(req: Request): boolean {
  const hash = crypto
    .createHmac('sha512', config.paystack.webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === req.headers['x-paystack-signature'];
}

export const handlePaystackWebhook = async (req: Request, res: Response) => {
  if (!verifySignature(req)) {
    logger.warn('Invalid Paystack webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Acknowledge immediately — Paystack retries if it doesn't get 200 quickly
  res.status(200).json({ received: true });

  const event = req.body as { event: string; data: Record<string, unknown> };
  logger.info(`Paystack webhook: ${event.event}`);

  // Idempotency: skip if this event was already processed
  const eventId = (event.data.id as string | number)?.toString();
  if (eventId) {
    const { data: existing } = await supabase
      .from('payment_webhooks')
      .select('id')
      .eq('provider', 'paystack')
      .eq('event_id', eventId)
      .eq('event_type', event.event)
      .maybeSingle();
    if (existing) {
      logger.info(`Skipping duplicate Paystack event ${event.event} id=${eventId}`);
      return;
    }
  }

  // Log the event
  await supabase.from('payment_webhooks').insert({
    provider: 'paystack',
    event_type: event.event,
    event_id: eventId,
    payload: event,
  }).then(({ error }) => {
    if (error) logger.warn('Failed to log webhook event:', error);
  });

  try {
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
  } catch (err) {
    logger.error(`Error processing Paystack ${event.event}:`, err);
  }
};

async function handleChargeSuccess(data: Record<string, unknown>) {
  const reference = data.reference as string;
  const metadata = data.metadata as Record<string, unknown> | undefined;

  logger.info(`Processing charge.success: ${reference}`);

  // Find the transaction (check both tables for compatibility)
  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('reference', reference)
    .maybeSingle()
    .then(async (res) => {
      if (res.data) return res;
      return supabase.from('transactions').select('*').eq('reference', reference).maybeSingle();
    });

  if (!transaction) {
    logger.error(`No transaction found for reference: ${reference}`);
    return;
  }

  // Skip if already processed (idempotency at the transaction level)
  if (transaction.status === 'completed' || transaction.status === 'success') {
    logger.info(`Transaction ${reference} already processed, skipping`);
    return;
  }

  // Update transaction
  const table = transaction.subscription_id != null ? 'payment_transactions' : 'transactions';
  await supabase
    .from(table)
    .update({
      status: 'success',
      provider_response: data,
      webhook_data: data,
      webhook_received_at: new Date().toISOString(),
    })
    .eq('id', transaction.id);

  // Activate subscription if applicable
  if (transaction.subscription_id) {
    await activateSubscription(transaction.subscription_id as string, reference);
  } else {
    const type = (metadata?.type ?? transaction.metadata?.type) as string | undefined;
    if (type === 'subscription') {
      await activateSubscriptionFromMetadata(transaction, metadata);
    } else if (type === 'wallet_topup') {
      await processWalletTopup(transaction);
    }
  }
}

async function activateSubscription(subscriptionId: string, paymentReference: string) {
  logger.info(`Activating subscription: ${subscriptionId}`);
  const { error } = await supabase.rpc('activate_subscription', {
    p_subscription_id: subscriptionId,
    p_payment_reference: paymentReference,
  });
  if (error) {
    logger.error('Failed to activate subscription via RPC:', error);
    return;
  }
  logger.info(`Subscription activated: ${subscriptionId}`);
}

async function activateSubscriptionFromMetadata(
  transaction: Record<string, unknown>,
  metadata: Record<string, unknown> | undefined
) {
  const userId = transaction.user_id as string;
  const tierId = (metadata?.tier_id ?? metadata?.plan_name) as string | undefined;
  if (!tierId) {
    logger.warn('No tier_id in metadata for subscription activation');
    return;
  }

  const { data: tier } = await supabase
    .from('membership_tiers')
    .select('duration_months')
    .eq('id', tierId)
    .maybeSingle();

  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + (tier?.duration_months ?? 1));

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    tier_id: tierId,
    status: 'active',
    starts_at: now.toISOString(),
    ends_at: endDate.toISOString(),
    auto_renew: (metadata?.auto_renew as boolean) ?? true,
    payment_method: 'paystack',
  });

  if (error) logger.error('Failed to upsert subscription:', error);
  else logger.info(`Subscription activated for user ${userId}, tier ${tierId}`);
}

async function processWalletTopup(transaction: Record<string, unknown>) {
  const userId = transaction.user_id as string;
  const amount = transaction.amount as number;
  logger.info(`Processing wallet topup: user ${userId}, ₦${amount / 100}`);
  const { error } = await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: amount });
  if (error) logger.error('Failed to update wallet:', error);
  else logger.info(`Wallet topped up: user ${userId} + ₦${amount / 100}`);
}

async function handleTransferSuccess(data: Record<string, unknown>) {
  const reference = data.reference as string;
  logger.info(`Transfer success: ${reference}`);
  const { error } = await supabase
    .from('withdrawals')
    .update({ status: 'completed', completed_at: new Date().toISOString(), gateway_response: 'Transfer successful' })
    .eq('reference', reference);
  if (error) logger.error('Failed to update withdrawal:', error);
}

async function handleTransferFailed(data: Record<string, unknown>) {
  const reference = data.reference as string;
  logger.info(`Transfer failed: ${reference}`);
  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status')
    .eq('reference', reference)
    .maybeSingle();
  if (!withdrawal) { logger.error(`Withdrawal not found: ${reference}`); return; }
  if (withdrawal.status === 'failed') return; // already handled

  await supabase
    .from('withdrawals')
    .update({ status: 'failed', gateway_response: (data.reason as string) || 'Transfer failed' })
    .eq('id', withdrawal.id);

  // Refund
  const { error } = await supabase.rpc('increment_wallet_balance', {
    p_user_id: withdrawal.user_id,
    p_amount: withdrawal.amount,
  });
  if (error) logger.error('Failed to refund wallet:', error);
  else logger.info(`Withdrawal failed, ₦${withdrawal.amount / 100} refunded to user ${withdrawal.user_id}`);
}

async function handleTransferReversed(data: Record<string, unknown>) {
  const reference = data.reference as string;
  logger.info(`Transfer reversed: ${reference}`);
  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status')
    .eq('reference', reference)
    .maybeSingle();
  if (!withdrawal) return;
  if (withdrawal.status === 'reversed') return; // already handled

  await supabase
    .from('withdrawals')
    .update({ status: 'reversed', gateway_response: 'Transfer reversed' })
    .eq('id', withdrawal.id);

  await supabase.rpc('increment_wallet_balance', { p_user_id: withdrawal.user_id, p_amount: withdrawal.amount });
  logger.info(`Transfer reversed, ₦${withdrawal.amount / 100} refunded`);
}
