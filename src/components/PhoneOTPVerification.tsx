// ============================================================================
// FIXED: src/components/PhoneOTPVerification.tsx
// Added phone number validation to prevent empty string errors
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';
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
  const [otpId, setOtpId] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validate phone on mount
  useEffect(() => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Phone number required');
      return;
    }
    if (!otpSent) handleSendOTP();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (otpSent) inputRefs.current[0]?.focus();
  }, [otpSent]);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Phone number is required');
      toast.error('Phone number required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data, error: otpError } = await supabase
        .rpc('generate_otp', {
          p_user_id: user?.id,
          p_purpose: purpose,
        })
        .single();

      if (otpError) throw otpError;

      const code = data.code;
      const generatedOtpId = data.otp_id;
      setOtpId(generatedOtpId);

      console.log('Sending OTP to:', phoneNumber);
      const smsResult = await sendOTPSMS(phoneNumber, code, purpose);

      if (!smsResult.success) {
        throw new Error(smsResult.error || 'Failed to send SMS');
      }

      setOtpSent(true);
      setResendCooldown(60);
      toast.success('OTP sent!');
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP');
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== '') && index === 5) {
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
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];

    pastedData.forEach((char, index) => {
      if (index < 6 && /^\d$/.test(char)) {
        newOtp[index] = char;
      }
    });

    setOtp(newOtp);
    if (newOtp.every((digit) => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (code: string) => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');

      const { data, error: verifyError } = await supabase
        .rpc('verify_otp', {
          p_user_id: user.id,
          p_code: code,
        });

      if (verifyError) throw verifyError;
      if (!data) throw new Error('Invalid or expired OTP');

      toast.success('Verified!');
      onVerified(otpId || '');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
      toast.error('Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phoneNumber ? phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';

  if (!phoneNumber || phoneNumber.trim() === '') {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">Phone Number Required</h3>
        <p className="text-gray-600 mb-4">
          Please add a phone number to your account.
        </p>
        <Button onClick={onCancel} variant="outline">Cancel</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Smartphone className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Enter Verification Code</h3>
        <p className="text-sm text-gray-600">
          Code sent to <span className="font-medium">{maskedPhone}</span>
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
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={loading}
            className="w-12 h-12 text-center text-xl font-bold"
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => handleVerify(otp.join(''))}
          disabled={loading || otp.some((d) => !d)}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>

        <Button
          onClick={handleSendOTP}
          disabled={resendCooldown > 0 || loading}
          variant="outline"
          className="flex-1"
        >
          {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
        </Button>
      </div>

      <button onClick={onCancel} className="text-sm text-gray-500 w-full">
        Cancel
      </button>

      <p className="text-xs text-gray-500 text-center">
        Expires in 10 minutes • Max 5 attempts
      </p>
    </div>
  );
}