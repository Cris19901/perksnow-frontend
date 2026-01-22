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
      // Get metadata from Paystack response - this contains the subscription and user info
      const metadata = paystackData.data.metadata || {}
      console.log('Payment metadata:', JSON.stringify(metadata))

      const subscriptionId = metadata.subscription_id
      const userId = metadata.user_id
      const planName = metadata.plan_name || 'pro'
      const billingCycle = metadata.billing_cycle || 'monthly'

      console.log('Extracted IDs - subscriptionId:', subscriptionId, 'userId:', userId)

      if (!subscriptionId || !userId) {
        console.error('Missing subscription_id or user_id in metadata')
        // Try to get from transaction as fallback
        const { data: transaction, error: txFetchError } = await supabase
          .from('payment_transactions')
          .select('subscription_id, user_id')
          .eq('reference', reference)
          .single()

        console.log('Fallback transaction lookup:', transaction, 'Error:', txFetchError)
      }

      // Calculate expiry date
      const expiresAt = new Date()
      if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else if (billingCycle === 'daily') {
        expiresAt.setDate(expiresAt.getDate() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      console.log('Activating subscription:', subscriptionId, 'for user:', userId)
      console.log('Expires at:', expiresAt.toISOString())

      // Update payment transaction
      const { error: txUpdateError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          paid_at: new Date().toISOString(),
          provider_response: paystackData.data,
        })
        .eq('reference', reference)

      if (txUpdateError) {
        console.error('Error updating transaction:', txUpdateError)
      } else {
        console.log('Transaction updated successfully')
      }

      // Activate subscription using ID from metadata
      if (subscriptionId) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_status: 'paid',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq('id', subscriptionId)

        if (subError) {
          console.error('Error updating subscription:', subError)
        } else {
          console.log('Subscription updated successfully')
        }
      }

      // Update user subscription status using ID from metadata
      if (userId) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            subscription_tier: planName,
            subscription_status: 'active',
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq('id', userId)

        if (userError) {
          console.error('Error updating user:', userError)
        } else {
          console.log('User updated successfully')
        }
      }

      // Get updated subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single()

      console.log('Final subscription state:', subscription)

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
