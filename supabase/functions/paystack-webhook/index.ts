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

    // SECURITY: Signature verification is MANDATORY
    if (!signature) {
      console.error('Missing webhook signature - rejecting request')
      return new Response('Missing signature', { status: 401 })
    }

    // Verify webhook signature
    const hash = createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      console.error('Invalid webhook signature')
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('Webhook received:', event.event)

    // Handle different event types
    if (event.event === 'charge.success') {
      const { reference, amount, customer, metadata } = event.data

      console.log('Payment successful:', { reference, amount, metadata })

      // --- MARKETPLACE ORDER PAYMENT ---
      if (metadata?.type === 'marketplace_order' && metadata?.order_id) {
        const orderId = metadata.order_id
        console.log('Marketplace order payment confirmed:', orderId)

        // Mark order as paid
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('status', 'pending') // idempotency guard

        if (orderError) {
          console.error('Error updating order status:', orderError)
        } else {
          console.log('Order marked as paid:', orderId)
        }

        return new Response(
          JSON.stringify({ received: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      // --- END MARKETPLACE ORDER PAYMENT ---

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
        // Get plan name from metadata or lookup from subscription
        let planName = metadata?.plan_name
        const billingCycle = metadata?.billing_cycle || 'monthly'

        // If plan name missing from metadata, get from subscription record
        if (!planName && transaction.subscription_id) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('plan_name')
            .eq('id', transaction.subscription_id)
            .single()
          if (subData) {
            planName = subData.plan_name
          }
        }

        const planTier = (planName || 'pro').toLowerCase()

        // Calculate expiry date based on plan tier
        const expiresAt = new Date()
        if (planTier === 'daily') {
          expiresAt.setDate(expiresAt.getDate() + 1)
        } else if (planTier === 'starter') {
          expiresAt.setDate(expiresAt.getDate() + 15)
        } else if (planTier === 'weekly') {
          expiresAt.setDate(expiresAt.getDate() + 7)
        } else if (billingCycle === 'yearly') {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        } else {
          // Default to monthly (30 days) for 'basic' and 'pro'
          expiresAt.setMonth(expiresAt.getMonth() + 1)
        }

        console.log('Activating subscription:', {
          subscription_id: transaction.subscription_id,
          user_id: transaction.user_id,
          plan_tier: planTier,
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
        } else {
          console.log('Subscription record updated successfully')
        }

        // Update user subscription status + sustainability flags
        const userUpdateData: Record<string, any> = {
          subscription_tier: planTier,
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString(),
          has_ever_subscribed: true,
        }

        // Mark daily plan as used (one-time only)
        if (planTier === 'daily') {
          userUpdateData.has_used_daily_plan = true
        }

        const { error: userError } = await supabase
          .from('users')
          .update(userUpdateData)
          .eq('id', transaction.user_id)

        if (userError) {
          console.error('Error updating user:', userError)
        } else {
          console.log('User subscription updated successfully')
        }

        console.log('Subscription activated successfully!')
      } else {
        console.error('No transaction found for reference:', reference)
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
