import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
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

    // Get raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    // Verify webhook signature
    if (signature) {
      const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(body)
        .digest('hex')

      if (hash !== signature) {
        console.error('Invalid webhook signature')
        return new Response('Invalid signature', { status: 401 })
      }
    }

    const event = JSON.parse(body)
    console.log('Webhook received:', event.event)

    // Handle different event types
    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data

      console.log('Payment successful:', { reference, amount, metadata })

      // Update payment transaction
      const { error: txError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          paid_at: new Date().toISOString(),
          provider_response: event.data,
        })
        .eq('reference', reference)

      if (txError) {
        console.error('Error updating transaction:', txError)
      }

      // Get the subscription ID from the transaction
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('subscription_id, user_id')
        .eq('reference', reference)
        .single()

      if (transaction) {
        // Calculate expiry date based on billing cycle
        const expiresAt = new Date()
        const billingCycle = metadata?.billing_cycle || 'monthly'

        if (billingCycle === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        }

        console.log('Activating subscription:', {
          subscription_id: transaction.subscription_id,
          user_id: transaction.user_id,
          expires_at: expiresAt.toISOString(),
        })

        // Activate subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'paid',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', transaction.subscription_id)

        if (subError) {
          console.error('Error updating subscription:', subError)
        }

        // Update user subscription status
        const { error: userError } = await supabase
          .from('users')
          .update({
            subscription_tier: metadata?.plan_name || 'pro',
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq('id', transaction.user_id)

        if (userError) {
          console.error('Error updating user:', userError)
        }

        console.log('Subscription activated successfully!')
      }
    } else if (event.event === 'charge.failed') {
      const { reference } = event.data

      console.log('Payment failed:', reference)

      // Update payment transaction as failed
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          provider_response: event.data,
        })
        .eq('reference', reference)

      // Update subscription as failed
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('subscription_id')
        .eq('reference', reference)
        .single()

      if (transaction) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'failed',
            payment_status: 'failed',
          })
          .eq('id', transaction.subscription_id)
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
