import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, Crown, Loader2, Zap } from 'lucide-react';
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
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

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

      const selectedPlan = plans.find(p => p.id === planId);
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          plan_name: planName,
          status: 'pending',
          billing_cycle: 'monthly',
          amount: selectedPlan?.price_monthly || 0,
          currency: 'NGN',
          payment_provider: 'paystack',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (subError) throw subError;

      const reference = `SUB_${planName.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const { error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          subscription_id: subscription.id,
          provider: 'paystack',
          reference,
          amount: subscription.amount,
          currency: 'NGN',
          status: 'pending',
        });

      if (txError) throw txError;

      await supabase
        .from('subscriptions')
        .update({ payment_reference: reference })
        .eq('id', subscription.id);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      const email = authUser?.email || '';

      const { data: paystackData, error: paystackError } = await supabase.functions.invoke(
        'paystack-initialize',
        {
          body: {
            email,
            amount: subscription.amount,
            reference,
            callback_url: `${window.location.origin}/subscription/callback`,
            metadata: {
              subscription_id: subscription.id,
              plan_name: planName,
              billing_cycle: 'monthly',
              user_id: user.id,
            },
          },
        }
      );

      if (paystackError) {
        throw new Error(paystackError.message || 'Payment initialization failed');
      }

      if (!paystackData?.status) {
        throw new Error(paystackData?.message || 'Payment initialization failed');
      }

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

    if (plan.limits.duration_days && plan.name !== 'free') {
      features.push(`${plan.limits.duration_days} days access`);
    }

    if (plan.limits.max_posts_per_day) {
      features.push(`${plan.limits.max_posts_per_day} posts per day`);
    }

    if (plan.limits.max_comments_per_day) {
      features.push(`${plan.limits.max_comments_per_day} comments per day`);
    }

    if (plan.limits.unlimited_likes) {
      features.push('Unlimited likes');
    }

    if (plan.features.can_withdraw) {
      features.push('Withdraw earnings');
    }

    if (plan.features.verified_badge) {
      features.push('Verified badge');
    }

    if (plan.features.priority_support) {
      features.push('Priority support');
    }

    return features;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold flex-1">Choose Your Plan</h1>
          <Button
            variant="outline"
            onClick={() => navigate('/payment/history')}
            className="hidden md:flex"
          >
            Payment History
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
          Upgrade to unlock more posts, comments, and withdrawal access
        </p>

        {userSubscription && (
          <div className="mb-8">
            <Badge variant={userSubscription.tier !== 'free' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
              Current Plan: {userSubscription.tier === 'free' ? 'Free' : userSubscription.tier.charAt(0).toUpperCase() + userSubscription.tier.slice(1)}
            </Badge>
            {userSubscription.expires_at && userSubscription.tier !== 'free' && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {userSubscription.status === 'active'
                  ? `Expires on ${new Date(userSubscription.expires_at).toLocaleDateString()}`
                  : `Expired on ${new Date(userSubscription.expires_at).toLocaleDateString()}`
                }
              </p>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const price = plan.price_monthly;
          const features = getPlanFeatures(plan);
          const isCurrentPlan = userSubscription?.tier === plan.name;
          const isPro = plan.name === 'pro';
          const isRecommended = plan.name === 'basic';

          return (
            <Card
              key={plan.id}
              className={`relative ${isPro ? 'border-purple-500 border-2 shadow-lg' : ''} ${isRecommended ? 'border-blue-500 border-2' : ''}`}
            >
              {isPro && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-4 py-1">
                    <Crown className="w-4 h-4 mr-1 inline" />
                    Power User
                  </Badge>
                </div>
              )}
              {isRecommended && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-4 py-1">
                    <Zap className="w-4 h-4 mr-1 inline" />
                    Best Value
                  </Badge>
                </div>
              )}

              <CardHeader className={isPro || isRecommended ? 'pt-8' : ''}>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {plan.display_name}
                  {isCurrentPlan && <Badge variant="outline">Current</Badge>}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-6">
                  <div className="text-3xl font-bold">
                    {price === 0 ? 'Free' : formatPrice(price)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {plan.limits.duration_days && plan.name !== 'free' && (
                      <span>{plan.limits.duration_days} days access</span>
                    )}
                    {plan.name === 'free' && <span>Forever free</span>}
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
                    {isCurrentPlan ? 'Current Plan' : 'Default Plan'}
                  </Button>
                ) : isCurrentPlan && userSubscription?.status === 'active' ? (
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
                      'Extend Subscription'
                    )}
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
                      'Subscribe Now'
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How do subscriptions work?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                All subscriptions are one-time payments with fixed durations. Starter gives you 15 days, Basic and Pro give you 30 days of premium access.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens when my subscription expires?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                When your subscription expires, you'll automatically return to the Free plan with 4 posts and 50 comments per day. You can resubscribe anytime.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">When can I withdraw my earnings?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Only paid subscribers (Starter, Basic, Pro) can withdraw earnings. Minimum withdrawal amount is ₦5,000.
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
