import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email';
import { toast } from 'sonner';

interface OTPVerificationProps {
  purpose: 'withdrawal' | 'login_2fa';
  onVerified: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

const RESEND_COOLDOWN = 60; // seconds

export function OTPVerification({ purpose, onVerified, onCancel, title, description }: OTPVerificationProps) {
  const { user } = useAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const sendOTP = async () => {
    if (!user) return;
    try {
      setSending(true);

      // Generate OTP via RPC (returns the code + email)
      const { data, error } = await supabase.rpc('generate_otp', {
        p_user_id: user.id,
        p_purpose: purpose,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate OTP');

      const email = data.email;
      const code = data.code;
      setUserEmail(email);

      // Send OTP email
      const template = emailTemplates.otpCode(code, purpose);
      await sendEmail({
        to: email,
        ...template,
      });

      setCodeSent(true);
      setResendCooldown(RESEND_COOLDOWN);
      setDigits(['', '', '', '', '', '']);
      toast.success(`Verification code sent to ${maskEmail(email)}`);

      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      console.error('OTP send error:', err);
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    if (!user) return;
    const code = digits.join('');
    if (code.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    try {
      setVerifying(true);

      const { data, error } = await supabase.rpc('verify_otp', {
        p_user_id: user.id,
        p_code: code,
        p_purpose: purpose,
      });

      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || 'Invalid code');
        return;
      }

      toast.success('Verification successful!');
      onVerified();
    } catch (err: any) {
      console.error('OTP verify error:', err);
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && newDigits.every(d => d !== '')) {
      setTimeout(() => verifyOTP(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      verifyOTP();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setDigits(newDigits);
      // Focus last filled input or the one after
      const focusIdx = Math.min(pasted.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const maskEmail = (email: string) => {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local[0]}${local[1]}***@${domain}`;
  };

  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <ShieldCheck className="w-8 h-8 text-purple-600" />
      </div>

      <h3 className="text-lg font-semibold mb-2">
        {title || (purpose === 'withdrawal' ? 'Verify Your Identity' : 'Two-Factor Authentication')}
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        {description || (codeSent
          ? `Enter the 6-digit code sent to ${maskEmail(userEmail)}`
          : 'We\'ll send a verification code to your registered email')}
      </p>

      {!codeSent ? (
        <div className="space-y-4">
          <Button
            onClick={sendOTP}
            disabled={sending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Code...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Verification Code
              </>
            )}
          </Button>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full text-gray-500">
              Cancel
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 6-digit OTP input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <Input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 focus:border-purple-500"
              />
            ))}
          </div>

          {/* Verify button */}
          <Button
            onClick={verifyOTP}
            disabled={verifying || digits.some(d => !d)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify Code
              </>
            )}
          </Button>

          {/* Resend */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={sendOTP}
              disabled={resendCooldown > 0 || sending}
              className={`text-sm flex items-center gap-1 ${
                resendCooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600 hover:text-purple-700 cursor-pointer'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="w-full text-gray-500">
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
