// ============================================================================
// FILE: supabase/functions/send-sms/index.ts
// FIXED: Proper CORS headers + error handling
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const TERMII_API_KEY = Deno.env.get('TERMII_API_KEY')
    const TERMII_SENDER_ID = Deno.env.get('TERMII_SENDER_ID') || 'LavLay'

    const { phoneNumber, code, purpose } = await req.json()

    console.log('Received request:', { phoneNumber, purpose })

    // Validate inputs
    if (!phoneNumber || !code || !purpose) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check API key
    if (!TERMII_API_KEY) {
      console.error('TERMII_API_KEY not set!')
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured - missing API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    console.log('Formatted phone:', formattedPhone)
    
    if (!formattedPhone) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid phone number format: ${phoneNumber}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create SMS message
    const message = createSMSMessage(code, purpose)
    console.log('Sending SMS:', { to: formattedPhone, from: TERMII_SENDER_ID })

    // Send via Termii API
    const termiiResponse = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: 'plain',
        channel: 'generic',
        api_key: TERMII_API_KEY,
      }),
    })

    const termiiData = await termiiResponse.json()
    console.log('Termii response:', termiiData)

    if (!termiiResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: termiiData.message || 'Termii API error',
          details: termiiData
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: termiiData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function formatPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '')

  // +2348012345678 → 2348012345678
  if (phone.startsWith('+')) {
    const withoutPlus = cleaned
    if (withoutPlus.startsWith('234') && withoutPlus.length === 13) {
      return withoutPlus
    }
  }

  // 08012345678 → 2348012345678
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.slice(1)
  }

  // Already 2348012345678
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return cleaned
  }

  return null
}

function createSMSMessage(code: string, purpose: string): string {
  const messages: Record<string, string> = {
    withdrawal: `Your LavLay withdrawal code is: ${code}. Valid for 10 minutes. Do not share.`,
    phone_verification: `Your LavLay verification code is: ${code}. Valid for 10 minutes.`,
    login_2fa: `Your LavLay login code is: ${code}. Valid for 10 minutes. If you did not request this, contact support.`,
  }
  return messages[purpose] || `Your LavLay code is: ${code}`
}