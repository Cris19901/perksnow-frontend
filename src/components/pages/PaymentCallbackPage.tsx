import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { CheckCircle2, XCircle, Loader2, Crown } from 'lucide-react';

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref'); // Paystack returns this

      const paymentReference = reference || trxref;

      if (!paymentReference) {
        setStatus('failed');
        setMessage('Payment reference not found');
        return;
      }

      setMessage('Verifying payment with provider...');

      // Use Edge Function to verify - it has service role access and handles everything
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'paystack-verify',
        {
          body: { reference: paymentReference },
        }
      );

      console.log('Verify response:', verifyData, verifyError);

      if (verifyError) {
        console.error('Verification error:', verifyError);
        setStatus('failed');
        setMessage('Payment verification failed. Please contact support if amount was deducted.');
        return;
      }

      if (verifyData?.status && verifyData?.data?.payment_status === 'success') {
        // Payment was successful - subscription is already activated by the Edge Function
        setStatus('success');
        setMessage('Payment successful! Your subscription is now active.');
        if (verifyData.data.subscription) {
          setSubscriptionDetails(verifyData.data.subscription);
        }
      } else if (verifyData?.data?.payment_status === 'pending') {
        setStatus('failed');
        setMessage('Payment is still being processed. Please wait a few minutes and check your profile.');
      } else {
        setStatus('failed');
        setMessage('Payment was not successful. Please try again or contact support if amount was deducted.');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setMessage('Failed to verify payment. Please contact support.');
    }
  };

  const handleContinue = () => {
    if (status === 'success') {
      navigate('/');
    } else {
      navigate('/subscription');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
              </div>
              <CardTitle>Verifying Payment</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-green-600 dark:text-green-400">Payment Successful!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <CardTitle className="text-red-600 dark:text-red-400">Payment Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {subscriptionDetails && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-blue-700 dark:text-blue-300">
                  Pro Subscription
                </h3>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Plan: {subscriptionDetails.plan_name}</p>
                <p>Billing: {subscriptionDetails.billing_cycle}</p>
                {subscriptionDetails.expires_at && (
                  <p>
                    Expires: {new Date(subscriptionDetails.expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>You can now withdraw your earnings</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Verified badge added to your profile</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Increased posting limits activated</span>
              </p>
            </div>
          )}

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'success' ? 'Continue to Dashboard' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
