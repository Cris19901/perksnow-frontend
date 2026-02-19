// Create: src/components/pages/VerifyWithdrawalPage.tsx

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VerifyWithdrawalPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('verify_withdrawal_token', { p_token: token });

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        setMessage('Withdrawal verified successfully! We will process your request shortly.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to verify withdrawal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Verifying...</h2>
            <p className="text-gray-600">Please wait while we verify your withdrawal.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-green-700 mb-2">Verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button
              onClick={() => navigate('/points')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
            >
              Go to Points
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button
              onClick={() => navigate('/points')}
              variant="outline"
              className="w-full"
            >
              Back to Points
            </Button>
          </>
        )}
      </div>
    </div>
  );
}