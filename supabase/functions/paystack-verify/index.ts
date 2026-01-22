import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('Paystack secret key not configured')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { reference } = await req.json()

    if (!reference) {
      throw new Error('Missing required field: reference')
    }

    console.log('Verifying payment:', reference)

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    )

    const paystackData = await paystackResponse.json()

    console.log('Paystack verification response:', paystackData)

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Payment verification failed')
    }

    const paymentStatus = paystackData.data.status

    if (paymentStatus === 'success') {
      // Get metadata from Paystack response
      const metadata = paystackData.data.metadata || {}

      // Update payment transaction
      await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          paid_at: new Date().toISOString(),
          provider_response: paystackData.data,
        })
        .eq('reference', reference)

      // Get the subscription ID from the transaction
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('subscription_id, user_id')
        .eq('reference', reference)
        .single()

      if (transaction) {
        // Calculate expiry date
        const expiresAt = new Date()
        const billingCycle = metadata.billing_cycle || 'monthly'

        if (billingCycle === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        }

        // Activate subscription
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'paid',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', transaction.subscription_id)

        // Update user subscription status
        await supabase
          .from('users')
          .update({
            subscription_tier: metadata.plan_name || 'pro',
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq('id', transaction.user_id)

        // Get updated subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', transaction.subscription_id)
          .single()

        return new Response(
          JSON.stringify({
            status: true,
            message: 'Payment verified and subscription activated',
            data: {
              payment_status: paymentStatus,
              subscription,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }
    }

    return new Response(
      JSON.stringify({
        status: true,
        message: 'Payment verification complete',
        data: {
          payment_status: paymentStatus,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message || 'Failed to verify payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
