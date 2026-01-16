import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: Record<string, any>;
  limits: Record<string, any>;
  sort_order: number;
}

interface UserSubscription {
  tier: string;
  status: string;
  expires_at: string | null;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadPlansAndSubscription();
  }, [user]);

  const loadPlansAndSubscription = async () => {
    try {
      setLoading(true);

      // Load subscription plans
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Load user's subscription if logged in
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('subscription_tier, subscription_status, subscription_expires_at')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        setUserSubscription({
          tier: userData.subscription_tier,
          status: userData.subscription_status,
          expires_at: userData.subscription_expires_at,
        });
      }
    } catch (error: any) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, planName: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    if (planName === 'free') {
      toast.error('You are already on the Free plan');
      return;
    }

    try {
      setSubscribing(planId);

      // Create subscription record
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          plan_name: planName,
          status: 'pending',
          billing_cycle: billingCycle,
          amount: plans.find(p => p.id === planId)?.[billingCycle === 'yearly' ? 'price_yearly' : 'price_monthly'] || 0,
          currency: 'NGN',
          payment_provider: 'paystack',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (subError) throw subError;

      // Generate payment reference
      const reference = `SUB_${planName.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create payment transaction
      const { data: transaction, error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          subscription_id: subscription.id,
          provider: 'paystack',
          reference,
          amount: subscription.amount,
          currency: 'NGN',
          status: 'pending',
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update subscription with payment reference
      await supabase
        .from('subscriptions')
        .update({ payment_reference: reference })
        .eq('id', subscription.id);

      // Get user email
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const email = authUser?.email || '';

      // Initialize Paystack payment
      const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: subscription.amount * 100, // Convert to kobo
          reference,
          callback_url: `${window.location.origin}/subscription/callback`,
          metadata: {
            subscription_id: subscription.id,
            plan_name: planName,
            billing_cycle: billingCycle,
            user_id: user.id,
          },
        }),
      });

      const paystackData = await paystackResponse.json();

      if (!paystackData.status) {
        throw new Error(paystackData.message || 'Payment initialization failed');
      }

      // Redirect to Paystack payment page
      window.location.href = paystackData.data.authorization_url;
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to initialize subscription');
      setSubscribing(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    const features = [];

    if (plan.limits.max_posts_per_day) {
      features.push(`${plan.limits.max_posts_per_day} posts per day`);
    }
    if (plan.limits.max_reels_per_day) {
      features.push(`${plan.limits.max_reels_per_day} reels per day`);
    }
    if (plan.limits.can_withdraw) {
      features.push('Withdraw earnings');
    }
    if (plan.limits.verified_badge) {
      features.push('Verified badge');
    }
    if (plan.features.priority_support) {
      features.push('Priority support');
    }
    if (plan.features.ad_free) {
      features.push('Ad-free experience');
    }

    return features;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
          Upgrade to Pro to unlock withdrawals and premium features
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center gap-4 mb-8">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'yearly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <Badge variant="secondary" className="ml-2">Save 16%</Badge>
          </Button>
        </div>

        {/* Current Subscription Status */}
        {userSubscription && (
          <div className="mb-8">
            <Badge variant={userSubscription.tier === 'pro' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
              Current Plan: {userSubscription.tier === 'pro' ? 'Pro' : 'Free'}
            </Badge>
            {userSubscription.expires_at && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {userSubscription.status === 'active'
                  ? `Renews on ${new Date(userSubscription.expires_at).toLocaleDateString()}`
                  : `Expires on ${new Date(userSubscription.expires_at).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          const monthlyEquivalent = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
          const features = getPlanFeatures(plan);
          const isCurrentPlan = userSubscription?.tier === plan.name;
          const isPro = plan.name === 'pro';

          return (
            <Card
              key={plan.id}
              className={`relative ${isPro ? 'border-blue-500 border-2 shadow-lg' : ''}`}
            >
              {isPro && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    <Crown className="w-4 h-4 mr-1 inline" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {plan.display_name}
                  {isCurrentPlan && <Badge variant="outline">Current</Badge>}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <div className="text-4xl font-bold">
                    {formatPrice(price)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {billingCycle === 'yearly' && (
                      <span>{formatPrice(monthlyEquivalent)}/month</span>
                    )}
                    {billingCycle === 'monthly' && <span>per month</span>}
                  </div>
                </div>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                {plan.name === 'free' ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isCurrentPlan && userSubscription?.status === 'active' ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id, plan.name)}
                    disabled={subscribing === plan.id}
                  >
                    {subscribing === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {isCurrentPlan ? 'Resubscribe' : 'Subscribe Now'}
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* FAQs or Additional Info */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can cancel your subscription at any time. You'll retain access until the end of your billing period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">When can I withdraw my earnings?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Only Pro subscribers can withdraw earnings. Minimum withdrawal amount is ₦5,000.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major payment methods through Paystack including card payments, bank transfers, and USSD.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
