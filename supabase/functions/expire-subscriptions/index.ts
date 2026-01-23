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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔍 Checking for expired subscriptions with grace period support...')

    // Call the grace period function to handle expirations
    const { data: results, error: expireError } = await supabase
      .rpc('expire_subscriptions_with_grace')

    if (expireError) {
      console.error('❌ Error processing expirations:', expireError)
      throw expireError
    }

    console.log(`📊 Processed ${results?.length || 0} subscription actions`)

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          status: true,
          message: 'No subscriptions to process',
          count: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Group actions by type
    const gracePeriodUsers = results.filter(r => r.action === 'entered_grace')
    const fullyExpiredUsers = results.filter(r => r.action === 'fully_expired')

    console.log(`✅ ${gracePeriodUsers.length} users entered grace period`)
    console.log(`✅ ${fullyExpiredUsers.length} subscriptions fully expired`)

    // Send notifications
    gracePeriodUsers.forEach(user => {
      supabase.functions.invoke('send-subscription-notification', {
        body: {
          type: 'expiry_reminder',
          userId: user.user_id,
        },
      }).catch((err) => console.error('Grace period email error for user:', user.user_id, err))
    })

    fullyExpiredUsers.forEach(user => {
      supabase.functions.invoke('send-subscription-notification', {
        body: {
          type: 'expired',
          userId: user.user_id,
        },
      }).catch((err) => console.error('Expiry email error for user:', user.user_id, err))
    })

    return new Response(
      JSON.stringify({
        status: true,
        message: `Processed ${results.length} subscription actions`,
        grace_period_entered: gracePeriodUsers.length,
        fully_expired: fullyExpiredUsers.length,
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ Subscription expiration error:', error)
    return new Response(
      JSON.stringify({
        status: false,
        message: error.message || 'Failed to process expired subscriptions',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
