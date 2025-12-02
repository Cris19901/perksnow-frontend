import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { resendVerificationEmail } from '@/lib/auth';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendEmail = async () => {
    if (!email) {
      setResendError('No email address found. Please try signing up again.');
      return;
    }

    try {
      setResending(true);
      setResendError(null);
      setResendSuccess(false);

      await resendVerificationEmail(email);

      setResendSuccess(true);
    } catch (err: any) {
      setResendError(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white">S</span>
              </div>
              <span className="text-xl">SocialHub</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Verification Message */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-purple-600" />
            </div>

            {/* Title */}
            <h2 className="text-3xl mb-3">Check your email</h2>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              We've sent a verification link to{' '}
              <span className="font-semibold text-gray-900">{email}</span>
              <br />
              <br />
              Click the link in the email to verify your account and start using SocialHub.
            </p>

            {/* Success Message */}
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">Verification email sent successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {resendError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{resendError}</span>
              </div>
            )}

            {/* Resend Button */}
            <div className="space-y-4">
              <Button
                onClick={handleResendEmail}
                disabled={resending}
                variant="outline"
                className="w-full"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </Button>

              {/* Back to Login */}
              <p className="text-sm text-gray-600">
                Already verified?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-purple-600 hover:underline font-medium"
                >
                  Log in
                </button>
              </p>
            </div>

            {/* Help Text */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or click the resend button above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
