// Multi-Provider Email Edge Function
// Supports: Brevo, SendGrid, Elastic Email, and Resend
// Automatic failover for maximum reliability

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Get API keys from environment
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const ELASTIC_API_KEY = Deno.env.get('ELASTIC_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface EmailRequest {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  provider?: 'brevo' | 'sendgrid' | 'elastic' | 'resend' | 'auto'
}

interface EmailResult {
  success: boolean
  provider?: string
  id?: string
  error?: string
  details?: any
}

// Brevo (Sendinblue) API - 300 emails/day FREE
async function sendViaBrevo(emailData: any): Promise<EmailResult> {
  if (!BREVO_API_KEY) {
    return { success: false, error: 'BREVO_API_KEY not set' }
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: emailData.fromName || 'LavLay',
          email: emailData.fromEmail || 'noreply@lavlay.com',
        },
        to: Array.isArray(emailData.to)
          ? emailData.to.map((email: string) => ({ email }))
          : [{ email: emailData.to }],
        subject: emailData.subject,
        htmlContent: emailData.html,
        textContent: emailData.text,
        replyTo: emailData.replyTo ? { email: emailData.replyTo } : undefined,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Brevo error:', data)
      return {
        success: false,
        provider: 'brevo',
        error: data.message || 'Failed to send via Brevo',
        details: data
      }
    }

    return {
      success: true,
      provider: 'brevo',
      id: data.messageId,
    }
  } catch (error) {
    console.error('Brevo exception:', error)
    return {
      success: false,
      provider: 'brevo',
      error: error.message
    }
  }
}

// SendGrid API - 100 emails/day FREE
async function sendViaSendGrid(emailData: any): Promise<EmailResult> {
  if (!SENDGRID_API_KEY) {
    return { success: false, error: 'SENDGRID_API_KEY not set' }
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: Array.isArray(emailData.to)
              ? emailData.to.map((email: string) => ({ email }))
              : [{ email: emailData.to }],
            subject: emailData.subject,
          },
        ],
        from: {
          email: emailData.fromEmail || 'noreply@lavlay.com',
          name: emailData.fromName || 'LavLay',
        },
        reply_to: emailData.replyTo ? { email: emailData.replyTo } : undefined,
        content: [
          {
            type: 'text/html',
            value: emailData.html || emailData.text || '',
          },
        ],
      }),
    })

    // SendGrid returns 202 with empty body on success
    if (response.status === 202) {
      return {
        success: true,
        provider: 'sendgrid',
        id: response.headers.get('x-message-id') || 'sent',
      }
    }

    const data = await response.json()
    console.error('SendGrid error:', data)
    return {
      success: false,
      provider: 'sendgrid',
      error: data.errors?.[0]?.message || 'Failed to send via SendGrid',
      details: data,
    }
  } catch (error) {
    console.error('SendGrid exception:', error)
    return {
      success: false,
      provider: 'sendgrid',
      error: error.message,
    }
  }
}

// Elastic Email API - 100 emails/day FREE
async function sendViaElasticEmail(emailData: any): Promise<EmailResult> {
  if (!ELASTIC_API_KEY) {
    return { success: false, error: 'ELASTIC_API_KEY not set' }
  }

  try {
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]

    const response = await fetch('https://api.elasticemail.com/v2/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        apikey: ELASTIC_API_KEY,
        from: emailData.fromEmail || 'noreply@lavlay.com',
        fromName: emailData.fromName || 'LavLay',
        to: recipients.join(','),
        subject: emailData.subject,
        bodyHtml: emailData.html || '',
        bodyText: emailData.text || '',
        replyTo: emailData.replyTo || '',
      }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      console.error('Elastic Email error:', data)
      return {
        success: false,
        provider: 'elastic',
        error: data.error || 'Failed to send via Elastic Email',
        details: data,
      }
    }

    return {
      success: true,
      provider: 'elastic',
      id: data.data?.messageid || data.transactionid,
    }
  } catch (error) {
    console.error('Elastic Email exception:', error)
    return {
      success: false,
      provider: 'elastic',
      error: error.message,
    }
  }
}

// Resend API - 100 emails/day FREE (after sandbox removal)
async function sendViaResend(emailData: any): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not set' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${emailData.fromName || 'LavLay'} <${emailData.fromEmail || 'noreply@lavlay.com'}>`,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        reply_to: emailData.replyTo,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend error:', data)
      return {
        success: false,
        provider: 'resend',
        error: data.message || 'Failed to send via Resend',
        details: data,
      }
    }

    return {
      success: true,
      provider: 'resend',
      id: data.id,
    }
  } catch (error) {
    console.error('Resend exception:', error)
    return {
      success: false,
      provider: 'resend',
      error: error.message,
    }
  }
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
    // Parse request body
    const body: EmailRequest = await req.json()
    const { to, subject, html, text, from, replyTo, provider } = body

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

    // Parse from address
    let fromName = 'LavLay'
    let fromEmail = 'noreply@lavlay.com'

    if (from) {
      const match = from.match(/^(.+?)\s*<(.+?)>$/)
      if (match) {
        fromName = match[1].trim()
        fromEmail = match[2].trim()
      } else {
        fromEmail = from
      }
    }

    const emailData = {
      to,
      subject,
      html,
      text,
      fromName,
      fromEmail,
      replyTo,
    }

    let result: EmailResult

    // If specific provider requested, try only that one
    if (provider && provider !== 'auto') {
      switch (provider) {
        case 'brevo':
          result = await sendViaBrevo(emailData)
          break
        case 'sendgrid':
          result = await sendViaSendGrid(emailData)
          break
        case 'elastic':
          result = await sendViaElasticEmail(emailData)
          break
        case 'resend':
          result = await sendViaResend(emailData)
          break
        default:
          return new Response(
            JSON.stringify({ error: `Unknown provider: ${provider}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
      }

      if (result.success) {
        return new Response(
          JSON.stringify({
            success: true,
            provider: result.provider,
            id: result.id,
            message: `Email sent successfully via ${result.provider}`,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: false,
          provider: result.provider,
          error: result.error,
          details: result.details,
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

    // Auto mode: Try providers in order with failover
    // Priority: Brevo (biggest free tier) -> SendGrid (most reliable) -> Elastic -> Resend
    const providers = [
      { name: 'brevo', fn: sendViaBrevo },
      { name: 'sendgrid', fn: sendViaSendGrid },
      { name: 'elastic', fn: sendViaElasticEmail },
      { name: 'resend', fn: sendViaResend },
    ]

    const errors: any[] = []

    for (const provider of providers) {
      result = await provider.fn(emailData)

      if (result.success) {
        console.log(`✅ Email sent successfully via ${result.provider}`)
        return new Response(
          JSON.stringify({
            success: true,
            provider: result.provider,
            id: result.id,
            message: `Email sent successfully via ${result.provider}`,
            failedProviders: errors.length > 0 ? errors : undefined,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        )
      }

      // Log failure and try next provider
      console.warn(`❌ ${provider.name} failed: ${result.error}`)
      errors.push({
        provider: provider.name,
        error: result.error,
      })
    }

    // All providers failed
    console.error('🚨 All email providers failed:', errors)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'All email providers failed',
        attempts: errors,
        message: 'Please check API keys and provider configurations',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (error) {
    console.error('Error in email function:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
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
