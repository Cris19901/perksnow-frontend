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
    const { email, amount, reference, callback_url, metadata } = await req.json()

    if (!email || !amount || !reference) {
      throw new Error('Missing required fields: email, amount, reference')
    }

    console.log('Initializing payment:', { email, amount, reference })

    // Initialize payment with Paystack
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo
        reference,
        callback_url,
        metadata,
      }),
    })

    const paystackData = await paystackResponse.json()

    console.log('Paystack response:', paystackData)

    if (!paystackData.status) {
      throw new Error(paystackData.message || 'Payment initialization failed')
    }

    return new Response(
      JSON.stringify({
        status: true,
        message: 'Payment initialized',
        data: paystackData.data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Payment initialization error:', error)
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message || 'Failed to initialize payment',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
