import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  type: 'welcome' | 'expiry_reminder' | 'expired' | 'receipt'
  userId: string
  email?: string
  username?: string
  subscriptionTier?: string
  expiresAt?: string
  amount?: number
  reference?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if email notifications are enabled
    const { data: featureFlag } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'email_notifications')
      .single()

    if (!featureFlag?.enabled) {
      console.log('Email notifications feature is disabled')
      return new Response(
        JSON.stringify({ status: true, message: 'Feature disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const data: NotificationData = await req.json()
    console.log('Sending notification:', data.type, 'to user:', data.userId)

    // Get user details if not provided
    let email = data.email
    let username = data.username

    if (!email || !username) {
      const { data: user } = await supabase
        .from('users')
        .select('email, username, full_name')
        .eq('id', data.userId)
        .single()

      email = email || user?.email
      username = username || user?.username || user?.full_name
    }

    if (!email) {
      throw new Error('User email not found')
    }

    // Prepare email content based on type
    let subject = ''
    let html = ''

    switch (data.type) {
      case 'welcome':
        subject = `Welcome to ${data.subscriptionTier?.toUpperCase()} - LavLay Premium!`
        html = `
          <h1>Welcome to LavLay Premium! 🎉</h1>
          <p>Hi ${username},</p>
          <p>Your <strong>${data.subscriptionTier}</strong> subscription is now active!</p>
          <p><strong>Benefits you now have:</strong></p>
          <ul>
            <li>✅ Unlimited posts and reels</li>
            <li>✅ Verified badge</li>
            <li>✅ Withdraw your earnings</li>
            <li>✅ Priority support</li>
            <li>✅ Ad-free experience</li>
          </ul>
          <p>Your subscription expires on: <strong>${new Date(data.expiresAt || '').toLocaleDateString()}</strong></p>
          <p>Enjoy your premium experience!</p>
          <p>Best regards,<br>The LavLay Team</p>
        `
        break

      case 'expiry_reminder':
        subject = 'Your LavLay Premium subscription expires soon'
        html = `
          <h1>Subscription Expiring Soon ⏰</h1>
          <p>Hi ${username},</p>
          <p>Your <strong>${data.subscriptionTier}</strong> subscription will expire on <strong>${new Date(data.expiresAt || '').toLocaleDateString()}</strong>.</p>
          <p>Don't lose access to your premium benefits:</p>
          <ul>
            <li>Verified badge</li>
            <li>Unlimited content creation</li>
            <li>Earnings withdrawal</li>
          </ul>
          <p><a href="https://www.lavlay.com/subscription" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Renew Subscription</a></p>
          <p>Best regards,<br>The LavLay Team</p>
        `
        break

      case 'expired':
        subject = 'Your LavLay Premium subscription has expired'
        html = `
          <h1>Subscription Expired</h1>
          <p>Hi ${username},</p>
          <p>Your <strong>${data.subscriptionTier}</strong> subscription has expired.</p>
          <p>You've been moved back to the Free plan. To regain access to premium features:</p>
          <p><a href="https://www.lavlay.com/subscription" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Subscribe Again</a></p>
          <p>Thank you for being a premium member!</p>
          <p>Best regards,<br>The LavLay Team</p>
        `
        break

      case 'receipt':
        subject = 'Payment Receipt - LavLay Premium'
        html = `
          <h1>Payment Received! 🧾</h1>
          <p>Hi ${username},</p>
          <p>Thank you for your payment!</p>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Plan: ${data.subscriptionTier}</li>
            <li>Amount: ₦${(data.amount || 0) / 100}</li>
            <li>Reference: ${data.reference}</li>
            <li>Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Your subscription is now active!</p>
          <p>Best regards,<br>The LavLay Team</p>
        `
        break
    }

    // Send email using existing send-email function
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject,
        html,
      },
    })

    if (emailError) {
      console.error('Email send error:', emailError)
      // Don't throw - we don't want to fail the subscription if email fails
    } else {
      console.log('Email sent successfully to:', email)
    }

    return new Response(
      JSON.stringify({
        status: true,
        message: 'Notification processed',
        emailSent: !emailError,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Notification error:', error)
    // Return success even on error - don't block subscription flow
    return new Response(
      JSON.stringify({
        status: true,
        message: 'Notification failed but not critical',
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
