/**
 * korapay-payout
 * Called by AdminWithdrawalsPage when admin approves a withdrawal.
 * Initiates a bank transfer or mobile money payout via Korapay Disbursements API.
 *
 * Docs: https://developers.korapay.com/docs/disbursements
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const KORAPAY_SECRET_KEY   = Deno.env.get('KORAPAY_SECRET_KEY')   ?? '';
const KORAPAY_API_BASE     = 'https://api.korapay.com/merchant/api/v1';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')          ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map withdrawal methods to Korapay bank codes for mobile money
const MOBILE_MONEY_BANKS: Record<string, string> = {
  mtn_momo:    '120001', // MTN MoMo
  airtel_money:'120002', // Airtel Money
  opay:        '100004', // OPay
  palmpay:     '100033', // PalmPay
  kuda:        '090267', // Kuda Bank
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify caller is admin
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const { data: adminCheck } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (adminCheck?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: corsHeaders });
    }

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) {
      return new Response(JSON.stringify({ error: 'withdrawal_id required' }), { status: 400, headers: corsHeaders });
    }

    // Fetch withdrawal details
    const { data: withdrawal, error: wErr } = await supabase
      .from('wallet_withdrawals')
      .select('*, user:users!user_id(full_name, email)')
      .eq('id', withdrawal_id)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: 'Withdrawal not found' }), { status: 404, headers: corsHeaders });
    }
    if (withdrawal.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Withdrawal is already ${withdrawal.status}` }), { status: 400, headers: corsHeaders });
    }

    // Build Korapay disbursement payload
    const reference = `LAVLAY-WD-${withdrawal_id.slice(0, 8).toUpperCase()}-${Date.now()}`;
    const isMobile  = Object.keys(MOBILE_MONEY_BANKS).includes(withdrawal.withdrawal_method);
    const bankCode  = isMobile
      ? MOBILE_MONEY_BANKS[withdrawal.withdrawal_method]
      : withdrawal.bank_code ?? null; // bank_code stored at submission time

    if (!bankCode && !isMobile) {
      return new Response(
        JSON.stringify({ error: 'No bank code on record. User must re-submit with bank code.' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const payload = {
      reference,
      destination: {
        type:           isMobile ? 'mobile_money' : 'bank_account',
        amount:         withdrawal.amount,
        currency:       'NGN',
        narration:      `LavLay withdrawal for ${withdrawal.account_name}`,
        bank_account:   !isMobile ? {
          bank:           bankCode,
          account:        withdrawal.account_number,
        } : undefined,
        mobile_money:   isMobile ? {
          operator: withdrawal.withdrawal_method === 'mtn_momo' ? 'mtn'
                  : withdrawal.withdrawal_method === 'airtel_money' ? 'airtel'
                  : 'other',
          mobile_number: withdrawal.account_number,
        } : undefined,
        customer: {
          name:  withdrawal.account_name || withdrawal.user?.full_name || 'LavLay User',
          email: withdrawal.user?.email ?? 'noreply@lavlay.com',
        },
      },
    };

    // Call Korapay API
    const koraRes = await fetch(`${KORAPAY_API_BASE}/transactions/disburse`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KORAPAY_SECRET_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    });

    const koraData = await koraRes.json();
    console.log('Korapay response:', JSON.stringify(koraData));

    if (!koraRes.ok || !koraData.status) {
      // Mark withdrawal as failed if Korapay rejects it
      await supabase.from('wallet_withdrawals').update({
        status:       'rejected',
        admin_notes:  `Korapay error: ${koraData.message ?? 'unknown error'}`,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      }).eq('id', withdrawal_id);

      return new Response(
        JSON.stringify({ error: koraData.message ?? 'Korapay disbursement failed' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark withdrawal as processing + store Korapay reference
    await supabase.from('wallet_withdrawals').update({
      status:                  'processing',
      transaction_reference:   reference,
      korapay_transfer_id:     koraData.data?.transaction_id ?? null,
      processed_by:            user.id,
      processed_at:            new Date().toISOString(),
    }).eq('id', withdrawal_id);

    // Audit log
    await supabase.from('admin_audit_log').insert({
      admin_id:           user.id,
      action:             'approve_withdrawal',
      target_user_id:     withdrawal.user_id,
      target_resource_id: withdrawal_id,
      details: {
        amount:    withdrawal.amount,
        currency:  'NGN',
        reference,
        provider:  'korapay',
        korapay_status: koraData.data?.status,
      },
    });

    return new Response(
      JSON.stringify({ success: true, reference, status: koraData.data?.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('korapay-payout error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
