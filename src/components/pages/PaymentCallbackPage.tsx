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

      // Wait a bit for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check payment transaction status
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .select('*, subscriptions(*)')
        .eq('reference', paymentReference)
        .single();

      if (txError || !transaction) {
        setStatus('failed');
        setMessage('Payment transaction not found. Please contact support.');
        return;
      }

      // Check if payment was successful
      if (transaction.status === 'success') {
        // Check subscription status
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('id', transaction.subscription_id)
          .single();

        if (subscription?.status === 'active') {
          setStatus('success');
          setMessage('Payment successful! Your subscription is now active.');
          setSubscriptionDetails(subscription);
        } else {
          // Payment successful but subscription not activated yet
          // Wait a bit more for webhook
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Check again
          const { data: updatedSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('id', transaction.subscription_id)
            .single();

          if (updatedSub?.status === 'active') {
            setStatus('success');
            setMessage('Payment successful! Your subscription is now active.');
            setSubscriptionDetails(updatedSub);
          } else {
            setStatus('success');
            setMessage('Payment received! Your subscription will be activated shortly.');
            setSubscriptionDetails(updatedSub);
          }
        }
      } else if (transaction.status === 'pending') {
        // Still pending - webhook might not have processed yet
        setMessage('Verifying payment with provider...');

        // Try verifying with Paystack directly
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${paymentReference}`,
          {
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        const verifyData = await verifyResponse.json();

        if (verifyData.status && verifyData.data.status === 'success') {
          // Payment was successful, webhook will process it
          setStatus('success');
          setMessage('Payment successful! Your subscription will be activated shortly.');
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support if amount was deducted.');
        }
      } else {
        setStatus('failed');
        setMessage('Payment failed. Please try again.');
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
