// ============================================================================
// FIXED: src/components/PhoneOTPVerification.tsx
// Added validation to prevent sending empty phone numbers
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, RefreshCw } from 'lucide-react';
import { sendOTPSMS } from '@/lib/sms';
import { toast } from 'sonner';

interface PhoneOTPVerificationProps {
  phoneNumber: string;
  purpose: 'withdrawal' | 'phone_verification' | 'login_2fa';
  onVerified: (otpId: string) => void;
  onCancel: () => void;
}

export default function PhoneOTPVerification({
  phoneNumber,
  purpose,
  onVerified,
  onCancel,
}: PhoneOTPVerificationProps) {
  const { user } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    // ✅ FIX: Only send OTP if phone number is valid
    if (!otpSent && phoneNumber && phoneNumber.trim()) {
      handleSendOTP();
    } else if (!phoneNumber || !phoneNumber.trim()) {
      setError('Phone number is required');
      toast.error('Phone number is missing');
    }
  }, []);

  useEffect(() => {
    if (otpSent) inputRefs.current[0]?.focus();
  }, [otpSent]);

  const handleSendOTP = async () => {
    // ✅ FIX: Validate phone number before sending
    if (!phoneNumber || !phoneNumber.trim()) {
      setError('Phone number is required');
      toast.error('Phone number is missing');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Generate OTP
      const { data: otpData, error: otpError } = await supabase
        .rpc('generate_otp', {
          p_user_id: user?.id,
          p_purpose: purpose,
        });

      if (otpError) throw otpError;
      if (!otpData || otpData.length === 0) {
        throw new Error('Failed to generate OTP');
      }

      // Send SMS with validation
      console.log('Sending OTP to:', phoneNumber);
      const smsResult = await sendOTPSMS(phoneNumber, otpData[0].code, purpose);
      
      if (!smsResult.success) {
        throw new Error(smsResult.error || 'Failed to send SMS');
      }

      setOtpSent(true);
      setResendCooldown(60);
      toast.success('OTP sent to your phone');
    } catch (err: any) {
      console.error('OTP send error:', err);
      setError(err.message || 'Failed to send OTP');
      toast.error(err.message || 'Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase.rpc('verify_otp', {
        p_user_id: user?.id,
        p_code: code,
        p_purpose: purpose,
      });

      if (error) throw error;

      if (data && data[0]?.success) {
        toast.success('Phone verified successfully!');
        onVerified(data[0].otp_id);
      } else {
        setError(data?.[0]?.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(digit => digit !== '') && index === 5) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      handleVerify(pastedData);
    }
  };

  const maskedPhone = phoneNumber 
    ? phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    : 'N/A';

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Enter Verification Code</h3>
        <p className="text-sm text-gray-600">
          We sent a 6-digit code to {maskedPhone}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-bold"
            disabled={loading || !otpSent}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => handleVerify(otp.join(''))}
          disabled={loading || otp.some(d => !d) || !otpSent}
          className="w-full"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Verify Code
        </Button>

        <Button
          variant="outline"
          onClick={handleSendOTP}
          disabled={loading || resendCooldown > 0 || !phoneNumber}
          className="w-full"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
        </Button>

        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={loading}
          className="w-full"
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-center text-gray-500">
        Code expires in 10 minutes • Max 5 attempts
      </p>
    </div>
  );
}