// ============================================================================
// FILE 2 of 4: src/components/PhoneOTPVerification.tsx
// PURPOSE: 6-digit OTP input component for phone verification
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
    if (!otpSent) handleSendOTP();
  }, []);

  useEffect(() => {
    if (otpSent) inputRefs.current[0]?.focus();
  }, [otpSent]);

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      setError('');

      // Generate OTP using YOUR existing function
      const { data: otpData, error: otpError } = await supabase
        .rpc('generate_otp', {
          p_user_id: user?.id,
          p_purpose: purpose,
        });

      if (otpError) throw otpError;

      // Send SMS
      const smsResult = await sendOTPSMS(phoneNumber, otpData[0].code, purpose);
      if (!smsResult.success) throw new Error(smsResult.error);

      setOtpSent(true);
      setResendCooldown(60);
      toast.success('OTP sent to your phone');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
      toast.error('Failed to send SMS');
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

    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        const newOtp = [...otp];
        digits.forEach((digit, i) => {
          if (i < 6) newOtp[i] = digit;
        });
        setOtp(newOtp);
        
        const lastIndex = Math.min(digits.length - 1, 5);
        inputRefs.current[lastIndex]?.focus();
        
        if (digits.length === 6) handleVerify(digits.join(''));
      });
    }
  };

  const handleVerify = async (code: string) => {
    try {
      setLoading(true);
      setError('');

      // Use YOUR existing verify function
      const { data, error: verifyError } = await supabase.rpc('verify_otp', {
        p_user_id: user?.id,
        p_code: code,
        p_purpose: purpose,
      });

      if (verifyError) throw verifyError;

      if (data && data[0]?.success) {
        toast.success('Phone verified!');
        onVerified(data[0].otp_id || 'verified');
      } else {
        setError(data?.[0]?.message || 'Invalid OTP');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError('Failed to verify OTP');
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

  if (!otpSent) {
    return (
      <div className="w-full max-w-md mx-auto p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Sending verification code...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Phone Verification</h2>
        <p className="text-muted-foreground text-sm">
          We've sent a 6-digit code via SMS to<br />
          <strong>{maskedPhone}</strong>
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={el => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            disabled={loading}
            className="w-12 h-14 text-center text-2xl font-bold"
          />
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button
          onClick={() => handleVerify(otp.join(''))}
          disabled={otp.some(d => !d) || loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Code'
          )}
        </Button>

        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={onCancel} disabled={loading} size="sm">
            Cancel
          </Button>
          <Button
            variant="ghost"
            onClick={handleSendOTP}
            disabled={loading || resendCooldown > 0}
            size="sm"
          >
            {resendCooldown > 0 ? (
              `Resend in ${resendCooldown}s`
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend Code
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Code expires in 10 minutes
      </p>
    </div>
  );
}