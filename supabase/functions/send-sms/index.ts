// ============================================================================
// FILE: supabase/functions/send-sms/index.ts
// FIXED: Uses 'dnd' channel which doesn't require registered Sender ID
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TERMII_API_KEY = Deno.env.get('TERMII_API_KEY')

    const { phoneNumber, code, purpose } = await req.json()
    console.log('Received request:', { phoneNumber, purpose })

    if (!phoneNumber || !code || !purpose) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!TERMII_API_KEY) {
      console.error('TERMII_API_KEY not set!')
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const formattedPhone = formatPhoneNumber(phoneNumber)
    console.log('Formatted phone:', formattedPhone)

    if (!formattedPhone) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid phone number: ${phoneNumber}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const message = createSMSMessage(code, purpose)

    // Try channels in order until one works
    const channels = [
      { channel: 'dnd', from: 'N-Alert' },
      { channel: 'generic', from: 'N-Alert' },
      { channel: 'whatsapp', from: 'N-Alert' },
    ]

    let lastError = null

    for (const { channel, from } of channels) {
      console.log(`Trying channel: ${channel}, from: ${from}`)

      const termiiResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formattedPhone,
          from,
          sms: message,
          type: 'plain',
          channel,
          api_key: TERMII_API_KEY,
        }),
      })

      const termiiData = await termiiResponse.json()
      console.log(`Channel ${channel} response:`, termiiData)

      // If successful, return immediately
      if (termiiData.code !== 404 && termiiData.status !== 'error') {
        return new Response(
          JSON.stringify({ success: true, data: termiiData, channel }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      lastError = termiiData
    }

    // All channels failed
    console.error('All channels failed:', lastError)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'SMS delivery failed on all channels. Please check your Termii account.',
        details: lastError
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function formatPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '')

  if (phone.startsWith('+')) {
    const withoutPlus = cleaned
    if (withoutPlus.startsWith('234') && withoutPlus.length === 13) {
      return withoutPlus
    }
  }

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.slice(1)
  }

  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return cleaned
  }

  return null
}

function createSMSMessage(code: string, purpose: string): string {
  const messages: Record<string, string> = {
    withdrawal: `Your LavLay withdrawal code is: ${code}. Valid for 10 minutes. Do not share.`,
    phone_verification: `Your LavLay verification code is: ${code}. Valid for 10 minutes.`,
    login_2fa: `Your LavLay login code is: ${code}. Valid for 10 minutes.`,
  }
  return messages[purpose] || `Your LavLay code is: ${code}`
}