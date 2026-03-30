import { Request, Response } from 'express';
import { config } from '../config';
import { supabase } from '../utils/supabase';
import { logger } from '../utils/logger';

function verifySignature(req: Request): boolean {
  const signature = req.headers['verif-hash'] as string | undefined;
  return !!signature && signature === config.flutterwave.webhookSecret;
}

export const handleFlutterwaveWebhook = async (req: Request, res: Response) => {
  if (!verifySignature(req)) {
    logger.warn('Invalid Flutterwave webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Acknowledge immediately
  res.status(200).json({ received: true });

  const event = req.body as { event: string; data: Record<string, unknown> };
  logger.info(`Flutterwave webhook: ${event.event}`);

  // Idempotency check
  const eventId = (event.data.id as string | number)?.toString();
  if (eventId) {
    const { data: existing } = await supabase
      .from('payment_webhooks')
      .select('id')
      .eq('provider', 'flutterwave')
      .eq('event_id', eventId)
      .eq('event_type', event.event)
      .maybeSingle();
    if (existing) {
      logger.info(`Skipping duplicate Flutterwave event ${event.event} id=${eventId}`);
      return;
    }
  }

  await supabase.from('payment_webhooks').insert({
    provider: 'flutterwave',
    event_type: event.event,
    event_id: eventId,
    payload: event,
  }).then(({ error }) => {
    if (error) logger.warn('Failed to log Flutterwave webhook event:', error);
  });

  try {
    switch (event.event) {
      case 'charge.completed':
        await handleChargeCompleted(event.data);
        break;
      case 'transfer.completed':
        await handleTransferCompleted(event.data);
        break;
      default:
        logger.info(`Unhandled Flutterwave event: ${event.event}`);
    }
  } catch (err) {
    logger.error(`Error processing Flutterwave ${event.event}:`, err);
  }
};

async function handleChargeCompleted(data: Record<string, unknown>) {
  const tx_ref = data.tx_ref as string;
  const amount = (data.amount as number) * 100; // to kobo
  const status = data.status as string;
  logger.info(`Flutterwave charge.completed: ${tx_ref} - ${status}`);

  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('reference', tx_ref)
    .maybeSingle();

  if (!transaction) { logger.error(`Transaction not found: ${tx_ref}`); return; }

  // Idempotency at transaction level
  if (transaction.status === 'completed') {
    logger.info(`Transaction ${tx_ref} already completed, skipping`);
    return;
  }

  await supabase.from('transactions').update({
    status: status === 'successful' ? 'completed' : 'failed',
    completed_at: status === 'successful' ? new Date().toISOString() : null,
    gateway_response: data.processor_response,
    payment_method: data.payment_type,
  }).eq('id', transaction.id);

  if (status !== 'successful') return;

  const metadata = (data.meta ?? transaction.metadata) as Record<string, unknown> | undefined;

  switch (metadata?.type) {
    case 'subscription':
      await processSubscription(transaction, metadata);
      break;
    case 'wallet_topup':
      await processWalletTopup(transaction, amount);
      break;
    default:
      logger.warn(`Unknown transaction type: ${metadata?.type}`);
  }
}

async function processSubscription(
  transaction: Record<string, unknown>,
  metadata: Record<string, unknown> | undefined
) {
  const userId = transaction.user_id as string;
  const tierId = metadata?.tier_id as string | undefined;
  if (!tierId) return;

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
    payment_method: 'flutterwave',
  });
  if (error) logger.error('Failed to upsert subscription:', error);
  else logger.info(`Subscription activated for user ${userId}`);
}

async function processWalletTopup(transaction: Record<string, unknown>, amountKobo: number) {
  const userId = transaction.user_id as string;
  const { error } = await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: amountKobo });
  if (error) logger.error('Failed to top up wallet:', error);
  else logger.info(`Wallet topped up: user ${userId} + ₦${amountKobo / 100}`);
}

async function handleTransferCompleted(data: Record<string, unknown>) {
  const reference = data.reference as string;
  const status = data.status as string;
  logger.info(`Flutterwave transfer.completed: ${reference} - ${status}`);

  const { data: withdrawal } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status')
    .eq('reference', reference)
    .maybeSingle();
  if (!withdrawal) { logger.error(`Withdrawal not found: ${reference}`); return; }

  if (status === 'SUCCESSFUL') {
    if (withdrawal.status === 'completed') return;
    await supabase.from('withdrawals').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      gateway_response: (data.complete_message as string) || 'Transfer successful',
    }).eq('id', withdrawal.id);
    logger.info(`Withdrawal completed: ${reference}`);
  } else if (status === 'FAILED') {
    if (withdrawal.status === 'failed') return;
    await supabase.from('withdrawals').update({
      status: 'failed',
      gateway_response: (data.complete_message as string) || 'Transfer failed',
    }).eq('id', withdrawal.id);
    // Refund
    await supabase.rpc('increment_wallet_balance', { p_user_id: withdrawal.user_id, p_amount: withdrawal.amount });
    logger.info(`Withdrawal failed, ₦${withdrawal.amount / 100} refunded to user ${withdrawal.user_id}`);
  }
}
