// Supabase Edge Function: process-scheduled-emails
// Processes scheduled onboarding emails and sends them via Resend
// Should be triggered by cron job every hour

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getEmailTemplate } from './templates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

interface PendingEmail {
  id: string
  user_id: string
  email_type: string
  email_address: string
  user_name: string
  points_balance: number
  scheduled_for: string
}

serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    console.log('🚀 Starting scheduled email processing...')

    // Verify environment variables
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get pending emails from database
    const { data: pendingEmails, error: fetchError } = await supabase
      .rpc('get_pending_emails', { batch_size: 50 })

    if (fetchError) {
      console.error('❌ Error fetching pending emails:', fetchError)
      throw fetchError
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log('✅ No pending emails to process')
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No pending emails'
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          status: 200,
        }
      )
    }

    console.log(`📧 Found ${pendingEmails.length} pending emails`)

    let successCount = 0
    let failCount = 0

    // Process each email
    for (const email of pendingEmails as PendingEmail[]) {
      try {
        console.log(`📨 Processing ${email.email_type} for ${email.email_address}`)

        // Get email template
        const template = getEmailTemplate(
          email.email_type,
          email.user_name,
          email.points_balance
        )

        if (!template) {
          throw new Error(`No template found for type: ${email.email_type}`)
        }

        // Send email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LavLay <noreply@lavlay.com>',
            to: email.email_address,
            subject: template.subject,
            html: template.html,
            text: template.text,
          }),
        })

        const resendData = await resendResponse.json()

        if (resendResponse.ok) {
          // Mark email as sent
          await supabase.rpc('mark_email_sent', {
            p_email_id: email.id,
            p_status: 'sent'
          })

          // Log email activity
          await supabase.rpc('log_email_activity', {
            p_user_id: email.user_id,
            p_email_type: email.email_type,
            p_email_address: email.email_address,
            p_subject: template.subject,
            p_status: 'sent',
            p_metadata: { resend_id: resendData.id }
          })

          console.log(`✅ Sent ${email.email_type} to ${email.email_address}`)
          successCount++
        } else {
          throw new Error(`Resend API error: ${JSON.stringify(resendData)}`)
        }
      } catch (emailError) {
        console.error(`❌ Failed to send ${email.email_type}:`, emailError)

        // Mark email as failed
        await supabase.rpc('mark_email_sent', {
          p_email_id: email.id,
          p_status: 'failed',
          p_error_message: emailError.message
        })

        // Log failure
        await supabase.rpc('log_email_activity', {
          p_user_id: email.user_id,
          p_email_type: email.email_type,
          p_email_address: email.email_address,
          p_subject: 'Failed to send',
          p_status: 'failed',
          p_error_message: emailError.message
        })

        failCount++
      }
    }

    console.log(`✅ Processing complete: ${successCount} sent, ${failCount} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingEmails.length,
        sent: successCount,
        failed: failCount,
        message: `Processed ${pendingEmails.length} emails: ${successCount} sent, ${failCount} failed`
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500,
      }
    )
  }
})
