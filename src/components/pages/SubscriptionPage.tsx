import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, Crown, Loader2, Zap, X, BadgeCheck } from 'lucide-react';
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

      // Load subscription plans (excluding inactive ones like starter)
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Get plan data for comparison table
  const freePlan = plans.find(p => p.name === 'free');
  const basicPlan = plans.find(p => p.name === 'basic');
  const proPlan = plans.find(p => p.name === 'pro');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold flex-1">Choose Your Plan</h1>
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

      {/* Subscription Cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {/* Free Plan */}
        {freePlan && (
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                {freePlan.display_name}
                {userSubscription?.tier === 'free' && <Badge variant="outline">Current</Badge>}
              </CardTitle>
              <CardDescription>{freePlan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-3xl font-bold">Free</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Forever free</div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{freePlan.limits.max_posts_per_day} posts per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{freePlan.limits.max_comments_per_day} comments per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Unlimited likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Earn points</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">No withdrawals</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">No verified badge</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                {userSubscription?.tier === 'free' ? 'Current Plan' : 'Default Plan'}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Basic Plan */}
        {basicPlan && (
          <Card className="relative border-blue-500 border-2">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500 text-white px-4 py-1">
                <Zap className="w-4 h-4 mr-1 inline" />
                Best Value
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                {basicPlan.display_name}
                {userSubscription?.tier === 'basic' && <Badge variant="outline">Current</Badge>}
              </CardTitle>
              <CardDescription>{basicPlan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-3xl font-bold">{formatPrice(basicPlan.price_monthly)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {basicPlan.limits.duration_days} days access
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{basicPlan.limits.max_posts_per_day} posts per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{basicPlan.limits.max_comments_per_day} comments per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Unlimited likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Earn points</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Withdraw earnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">No verified badge</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {userSubscription?.tier === 'basic' && userSubscription?.status === 'active' ? (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(basicPlan.id, basicPlan.name)}
                  disabled={subscribing === basicPlan.id}
                >
                  {subscribing === basicPlan.id ? (
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSubscribe(basicPlan.id, basicPlan.name)}
                  disabled={subscribing === basicPlan.id}
                >
                  {subscribing === basicPlan.id ? (
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
        )}

        {/* Pro Plan */}
        {proPlan && (
          <Card className="relative border-purple-500 border-2 shadow-lg">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-600 text-white px-4 py-1">
                <Crown className="w-4 h-4 mr-1 inline" />
                Power User
              </Badge>
            </div>
            <CardHeader className="pt-8">
              <CardTitle className="text-2xl flex items-center gap-2">
                {proPlan.display_name}
                {userSubscription?.tier === 'pro' && <Badge variant="outline">Current</Badge>}
              </CardTitle>
              <CardDescription>{proPlan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="text-3xl font-bold">{formatPrice(proPlan.price_monthly)}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {proPlan.limits.duration_days} days access
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{proPlan.limits.max_posts_per_day} posts per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">{proPlan.limits.max_comments_per_day} comments per day</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Unlimited likes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Earn points</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Withdraw earnings</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">Verified badge</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Priority support</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {userSubscription?.tier === 'pro' && userSubscription?.status === 'active' ? (
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(proPlan.id, proPlan.name)}
                  disabled={subscribing === proPlan.id}
                >
                  {subscribing === proPlan.id ? (
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
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => handleSubscribe(proPlan.id, proPlan.name)}
                  disabled={subscribing === proPlan.id}
                >
                  {subscribing === proPlan.id ? (
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
        )}
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-5xl mx-auto mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Compare Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-4 px-4 font-semibold">Feature</th>
                <th className="text-center py-4 px-4 font-semibold">Free</th>
                <th className="text-center py-4 px-4 font-semibold bg-blue-50">Basic</th>
                <th className="text-center py-4 px-4 font-semibold bg-purple-50">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-4 px-4">Price</td>
                <td className="text-center py-4 px-4">Free</td>
                <td className="text-center py-4 px-4 bg-blue-50/50">{formatPrice(3000)}</td>
                <td className="text-center py-4 px-4 bg-purple-50/50">{formatPrice(10000)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Duration</td>
                <td className="text-center py-4 px-4">Forever</td>
                <td className="text-center py-4 px-4 bg-blue-50/50">30 days</td>
                <td className="text-center py-4 px-4 bg-purple-50/50">30 days</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Posts per day</td>
                <td className="text-center py-4 px-4">4</td>
                <td className="text-center py-4 px-4 bg-blue-50/50">20</td>
                <td className="text-center py-4 px-4 bg-purple-50/50">50</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Comments per day</td>
                <td className="text-center py-4 px-4">50</td>
                <td className="text-center py-4 px-4 bg-blue-50/50">50</td>
                <td className="text-center py-4 px-4 bg-purple-50/50">100</td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Likes</td>
                <td className="text-center py-4 px-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-blue-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-purple-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Earn Points</td>
                <td className="text-center py-4 px-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-blue-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-purple-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Withdraw Earnings</td>
                <td className="text-center py-4 px-4">
                  <X className="w-5 h-5 text-gray-400 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-blue-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-purple-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">
                  <span className="flex items-center gap-2">
                    Verified Badge
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  </span>
                </td>
                <td className="text-center py-4 px-4">
                  <X className="w-5 h-5 text-gray-400 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-blue-50/50">
                  <X className="w-5 h-5 text-gray-400 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-purple-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-4 px-4">Priority Support</td>
                <td className="text-center py-4 px-4">
                  <X className="w-5 h-5 text-gray-400 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-blue-50/50">
                  <X className="w-5 h-5 text-gray-400 mx-auto" />
                </td>
                <td className="text-center py-4 px-4 bg-purple-50/50">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQs */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How do subscriptions work?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                All subscriptions are one-time payments with fixed durations. Basic and Pro give you 30 days of premium access.
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
                Only paid subscribers (Basic, Pro) can withdraw earnings. Minimum withdrawal amount is ₦5,000.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How do I get the verified badge?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                The blue verified badge is exclusively available to Pro subscribers (₦10,000 plan). It will be displayed next to your name throughout the app.
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
