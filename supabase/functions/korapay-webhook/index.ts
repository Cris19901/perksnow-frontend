/**
 * korapay-webhook
 * Receives transfer status events from Korapay.
 * Set webhook URL in Korapay dashboard to:
 *   https://kswknblwjlkgxgvypkmo.supabase.co/functions/v1/korapay-webhook
 *
 * Events handled:
 *   - transfer.success  → mark withdrawal completed, keep points deducted
 *   - transfer.failed   → mark withdrawal failed, refund points to user
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

const KORAPAY_SECRET_KEY   = Deno.env.get('KORAPAY_SECRET_KEY')        ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')               ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok');

  const body = await req.text();

  // Verify Korapay webhook signature (HMAC-SHA256)
  const signature = req.headers.get('x-korapay-signature') ?? '';
  if (KORAPAY_SECRET_KEY && signature) {
    const expected = createHmac('sha256', KORAPAY_SECRET_KEY).update(body).digest('hex');
    if (expected !== signature) {
      console.error('Invalid Korapay webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const event    = JSON.parse(body);
  const data     = event.data ?? {};

  console.log('Korapay webhook:', event.event, data.reference);

  // Idempotency: skip if already processed
  const { data: existing } = await supabase
    .from('payment_webhooks')
    .select('id')
    .eq('provider', 'korapay')
    .eq('event_type', event.event)
    .eq('event_id', data.reference ?? '')
    .maybeSingle();

  if (existing) {
    console.log('Already processed, skipping');
    return new Response('ok');
  }

  // Record webhook
  await supabase.from('payment_webhooks').insert({
    provider:   'korapay',
    event_type: event.event,
    event_id:   data.reference ?? null,
    payload:    event,
  });

  if (event.event === 'transfer.success') {
    // Find withdrawal by reference
    const { data: withdrawal } = await supabase
      .from('wallet_withdrawals')
      .select('id, user_id, amount, status')
      .eq('transaction_reference', data.reference)
      .maybeSingle();

    if (withdrawal && withdrawal.status === 'processing') {
      await supabase.from('wallet_withdrawals').update({
        status:       'completed',
        processed_at: new Date().toISOString(),
      }).eq('id', withdrawal.id);

      console.log(`Withdrawal ${withdrawal.id} completed via Korapay`);
    }
  }

  if (event.event === 'transfer.failed') {
    const { data: withdrawal } = await supabase
      .from('wallet_withdrawals')
      .select('id, user_id, amount, status')
      .eq('transaction_reference', data.reference)
      .maybeSingle();

    if (withdrawal && withdrawal.status === 'processing') {
      // Mark as failed
      await supabase.from('wallet_withdrawals').update({
        status:      'rejected',
        admin_notes: `Korapay transfer failed: ${data.message ?? 'unknown reason'}`,
      }).eq('id', withdrawal.id);

      // Refund wallet balance
      const { data: userData } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', withdrawal.user_id)
        .single();

      if (userData) {
        await supabase.from('users').update({
          wallet_balance: (userData.wallet_balance ?? 0) + withdrawal.amount,
        }).eq('id', withdrawal.user_id);

        // Refund points too (amount * 10 = points, since ₦1 = 10 points)
        await supabase.from('points_transactions').insert({
          user_id:  withdrawal.user_id,
          points:   withdrawal.amount * 10,
          activity: `Refund: withdrawal transfer failed (ref: ${data.reference})`,
        });
      }

      console.log(`Withdrawal ${withdrawal.id} failed — refunded ₦${withdrawal.amount}`);
    }
  }

  return new Response('ok');
});
