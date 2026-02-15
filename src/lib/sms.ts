// ============================================================================
// FILE 1 of 4: src/lib/sms.ts
// PURPOSE: SMS service for sending OTP codes via Termii
// ============================================================================

import { logger } from './logger';

// Termii configuration (Nigerian SMS provider)
const TERMII_API_KEY = import.meta.env.VITE_TERMII_API_KEY;
const TERMII_SENDER_ID = import.meta.env.VITE_TERMII_SENDER_ID || 'LavLay';

/**
 * Send OTP via SMS using Termii
 * Cost: ~₦2.50 per SMS
 */
export const sendOTPSMS = async (
  phoneNumber: string,
  code: string,
  purpose: 'withdrawal' | 'phone_verification' | 'login_2fa'
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!TERMII_API_KEY) {
      logger.error('TERMII_API_KEY not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return { success: false, error: 'Invalid phone number format' };
    }

    // Create message
    const message = createSMSMessage(code, purpose);

    // Send via Termii API
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
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
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Termii API error', data);
      return { success: false, error: data.message || 'Failed to send SMS' };
    }

    logger.log('SMS sent successfully', { phone: formattedPhone });
    return { success: true };
  } catch (error) {
    logger.error('Error sending SMS', error);
    return { success: false, error: 'Failed to send SMS' };
  }
};

/**
 * Format phone number to international format
 * 08012345678 → 2348012345678
 * 2348012345678 → 2348012345678
 * +2348012345678 → 2348012345678
 */
function formatPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');

  // Nigerian format: 0801234567 → 2348012345678
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '234' + cleaned.slice(1);
  }

  // Already formatted: 2348012345678
  if (cleaned.startsWith('234') && cleaned.length === 13) {
    return cleaned;
  }

  return null;
}

/**
 * Create SMS message based on purpose
 */
function createSMSMessage(code: string, purpose: string): string {
  const messages = {
    withdrawal: `Your LavLay withdrawal code is: ${code}. Valid for 10 minutes. Do not share.`,
    phone_verification: `Your LavLay verification code is: ${code}. Valid for 10 minutes.`,
    login_2fa: `Your LavLay login code is: ${code}. Valid for 10 minutes. If you didn't request this, contact support.`,
  };
  return messages[purpose as keyof typeof messages] || `Your LavLay code is: ${code}`;
}