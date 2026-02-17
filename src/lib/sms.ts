// ============================================================================
// UPDATED: src/lib/sms.ts
// Call Supabase Edge Function instead of Termii directly
// ============================================================================

import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Send OTP via SMS using Supabase Edge Function
 * This avoids CORS issues by sending from server-side
 */
export const sendOTPSMS = async (
  phoneNumber: string,
  code: string,
  purpose: 'withdrawal' | 'phone_verification' | 'login_2fa'
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        phoneNumber,
        code,
        purpose,
      },
    });

    if (error) {
      logger.error('Supabase function error', error);
      return { success: false, error: error.message || 'Failed to send SMS' };
    }

    if (!data.success) {
      logger.error('SMS sending failed', data);
      return { success: false, error: data.error || 'Failed to send SMS' };
    }

    logger.log('SMS sent successfully', { phone: phoneNumber });
    return { success: true };
    
  } catch (error: any) {
    logger.error('Error sending SMS', error);
    return { success: false, error: error.message || 'Failed to send SMS' };
  }
};