// ============================================================================
// FILE: supabase/functions/send-sms/index.ts
// PURPOSE: Server-side SMS sending via Termii (avoids CORS)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TERMII_API_KEY = Deno.env.get('TERMII_API_KEY')
const TERMII_SENDER_ID = Deno.env.get('TERMII_SENDER_ID') || 'LavLay'

serve(async (req) => {
  // CORS headers
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
    const { phoneNumber, code, purpose } = await req.json()

    // Validate inputs
    if (!phoneNumber || !code || !purpose) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check API key
    if (!TERMII_API_KEY) {
      console.error('TERMII_API_KEY not configured')
      return new Response(
        JSON.stringify({ success: false, error: 'SMS service not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (!formattedPhone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create SMS message
    const message = createSMSMessage(code, purpose)

    // Send via Termii API
    console.log('Sending SMS to:', formattedPhone)
    
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

    if (!termiiResponse.ok) {
      console.error('Termii API error:', termiiData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: termiiData.message || 'Failed to send SMS' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('SMS sent successfully:', termiiData)
    
    return new Response(
      JSON.stringify({ success: true, data: termiiData }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    console.error('Error in send-sms function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// Helper functions
function formatPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '')

  // Nigerian format: 0801234567 → 2348012345678
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.slice(1)
  }

  // Already formatted: 2348012345678
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return cleaned
  }

  // Remove + if present
  if (phone.startsWith('+')) {
    const withoutPlus = phone.slice(1).replace(/\D/g, '')
    if (withoutPlus.startsWith('234') && withoutPlus.length === 13) {
      return withoutPlus
    }
  }

  return null
}

function createSMSMessage(code: string, purpose: string): string {
  const messages: Record<string, string> = {
    withdrawal: `Your LavLay withdrawal code is: ${code}. Valid for 10 minutes. Do not share.`,
    phone_verification: `Your LavLay verification code is: ${code}. Valid for 10 minutes.`,
    login_2fa: `Your LavLay login code is: ${code}. Valid for 10 minutes. If you didn't request this, contact support.`,
  }
  return messages[purpose] || `Your LavLay code is: ${code}`
}