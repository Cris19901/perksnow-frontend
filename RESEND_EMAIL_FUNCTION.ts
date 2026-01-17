// Supabase Edge Function: send-email
// Deploy with: supabase functions deploy send-email --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
}

serve(async (req) => {
  // Handle CORS
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
    // Verify Resend API key exists
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }

    // Parse request body
    const body: EmailRequest = await req.json()
    const { to, subject, html, text, from, replyTo } = body

    // Validate required fields
    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (!html && !text) {
      return new Response(
        JSON.stringify({ error: 'Either html or text content is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Prepare email data
    const emailData = {
      from: from || 'LavLay <onboarding@resend.dev>', // Change to your domain after verification
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailData),
    })

    const resendData = await resendResponse.json()

    // Check if email was sent successfully
    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: resendData
        }),
        {
          status: resendResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        id: resendData.id,
        message: 'Email sent successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
