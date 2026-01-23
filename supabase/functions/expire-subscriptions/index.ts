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

    console.log('🔍 Checking for expired subscriptions...')

    // Find all users with expired subscriptions that are still marked as active
    const { data: expiredUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, username, subscription_tier, subscription_expires_at')
      .eq('subscription_status', 'active')
      .neq('subscription_tier', 'free')
      .lt('subscription_expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('❌ Error fetching expired subscriptions:', fetchError)
      throw fetchError
    }

    console.log(`📊 Found ${expiredUsers?.length || 0} expired subscriptions`)

    if (!expiredUsers || expiredUsers.length === 0) {
      return new Response(
        JSON.stringify({
          status: true,
          message: 'No expired subscriptions found',
          count: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Downgrade all expired users to free tier
    const userIds = expiredUsers.map(u => u.id)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
      })
      .in('id', userIds)

    if (updateError) {
      console.error('❌ Error updating users:', updateError)
      throw updateError
    }

    // Also update their subscriptions table
    const { error: subUpdateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
      })
      .in('user_id', userIds)
      .eq('status', 'active')

    if (subUpdateError) {
      console.error('❌ Error updating subscriptions:', subUpdateError)
    }

    console.log(`✅ Successfully expired ${expiredUsers.length} subscriptions`)

    // Send expiry notification emails (non-blocking)
    expiredUsers.forEach(user => {
      supabase.functions.invoke('send-subscription-notification', {
        body: {
          type: 'expired',
          userId: user.id,
          subscriptionTier: user.subscription_tier,
        },
      }).catch((err) => console.error('Expiry email error for user:', user.id, err))
    })

    return new Response(
      JSON.stringify({
        status: true,
        message: `Expired ${expiredUsers.length} subscriptions`,
        count: expiredUsers.length,
        users: expiredUsers.map(u => ({ id: u.id, username: u.username })),
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
