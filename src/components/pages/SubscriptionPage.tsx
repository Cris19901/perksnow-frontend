import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle2, Crown, Loader2, Zap, X, BadgeCheck, Clock } from 'lucide-react';
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

      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (plansError) throw plansError;
      setPlans(plansData || []);

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

  const renderPlanCard = (plan: SubscriptionPlan) => {
    const isCurrentPlan = userSubscription?.tier === plan.name;
    const isPro = plan.name === 'pro';
    const isBasic = plan.name === 'basic';
    const isDaily = plan.name === 'daily';

    return (
      <Card
        key={plan.id}
        className={`relative ${isPro ? 'border-purple-500 border-2 shadow-lg' : ''} ${isBasic ? 'border-blue-500 border-2' : ''}`}
      >
        {isPro && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-purple-600 text-white px-3 py-1 text-xs">
              <Crown className="w-3 h-3 mr-1 inline" />
              Power User
            </Badge>
          </div>
        )}
        {isBasic && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-blue-500 text-white px-3 py-1 text-xs">
              <Zap className="w-3 h-3 mr-1 inline" />
              Best Value
            </Badge>
          </div>
        )}
        {isDaily && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white px-3 py-1 text-xs">
              <Clock className="w-3 h-3 mr-1 inline" />
              Quick Access
            </Badge>
          </div>
        )}

        <CardHeader className={isPro || isBasic || isDaily ? 'pt-8' : ''}>
          <CardTitle className="text-xl flex items-center gap-2">
            {plan.display_name}
            {isCurrentPlan && <Badge variant="outline" className="text-xs">Current</Badge>}
          </CardTitle>
          <CardDescription className="text-xs">{plan.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <div className="text-2xl font-bold">
              {plan.price_monthly === 0 ? 'Free' : formatPrice(plan.price_monthly)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {plan.name === 'free' && 'Forever free'}
              {plan.limits.duration_days === 1 && '1 day access'}
              {plan.limits.duration_days === 15 && '15 days access'}
              {plan.limits.duration_days === 30 && '30 days access'}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{plan.limits.max_posts_per_day} posts/day</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{plan.limits.max_comments_per_day} comments/day</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Unlimited likes</span>
            </div>
            {plan.features.can_withdraw ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Withdraw earnings</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">No withdrawals</span>
              </div>
            )}
            {plan.features.verified_badge ? (
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-blue-600 font-medium">Verified badge</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">No badge</span>
              </div>
            )}
            {plan.features.priority_support && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>Priority support</span>
              </div>
            )}
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
                'Extend'
              )}
            </Button>
          ) : (
            <Button
              className={`w-full ${isPro ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''} ${isBasic ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''} ${isDaily ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
              onClick={() => handleSubscribe(plan.id, plan.name)}
              disabled={subscribing === plan.id}
            >
              {subscribing === plan.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Subscribe'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Get plans in order
  const freePlan = plans.find(p => p.name === 'free');
  const dailyPlan = plans.find(p => p.name === 'daily');
  const starterPlan = plans.find(p => p.name === 'starter');
  const basicPlan = plans.find(p => p.name === 'basic');
  const proPlan = plans.find(p => p.name === 'pro');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-10">
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
          <div className="mb-6">
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

      {/* Subscription Cards - 5 columns on large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
        {freePlan && renderPlanCard(freePlan)}
        {dailyPlan && renderPlanCard(dailyPlan)}
        {starterPlan && renderPlanCard(starterPlan)}
        {basicPlan && renderPlanCard(basicPlan)}
        {proPlan && renderPlanCard(proPlan)}
      </div>

      {/* Feature Comparison Table */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Compare Plans</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Feature</th>
                <th className="text-center py-3 px-2 font-semibold">Free</th>
                <th className="text-center py-3 px-2 font-semibold bg-green-50">Daily</th>
                <th className="text-center py-3 px-2 font-semibold">Starter</th>
                <th className="text-center py-3 px-2 font-semibold bg-blue-50">Basic</th>
                <th className="text-center py-3 px-2 font-semibold bg-purple-50">Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-2">Price</td>
                <td className="text-center py-3 px-2">Free</td>
                <td className="text-center py-3 px-2 bg-green-50/50">{formatPrice(200)}</td>
                <td className="text-center py-3 px-2">{formatPrice(2000)}</td>
                <td className="text-center py-3 px-2 bg-blue-50/50">{formatPrice(3000)}</td>
                <td className="text-center py-3 px-2 bg-purple-50/50">{formatPrice(10000)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Duration</td>
                <td className="text-center py-3 px-2">Forever</td>
                <td className="text-center py-3 px-2 bg-green-50/50">1 day</td>
                <td className="text-center py-3 px-2">15 days</td>
                <td className="text-center py-3 px-2 bg-blue-50/50">30 days</td>
                <td className="text-center py-3 px-2 bg-purple-50/50">30 days</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Posts/day</td>
                <td className="text-center py-3 px-2">4</td>
                <td className="text-center py-3 px-2 bg-green-50/50">10</td>
                <td className="text-center py-3 px-2">20</td>
                <td className="text-center py-3 px-2 bg-blue-50/50">20</td>
                <td className="text-center py-3 px-2 bg-purple-50/50">50</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Comments/day</td>
                <td className="text-center py-3 px-2">20</td>
                <td className="text-center py-3 px-2 bg-green-50/50">30</td>
                <td className="text-center py-3 px-2">30</td>
                <td className="text-center py-3 px-2 bg-blue-50/50">50</td>
                <td className="text-center py-3 px-2 bg-purple-50/50">100</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Unlimited Likes</td>
                <td className="text-center py-3 px-2"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-green-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-blue-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-purple-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Earn Points</td>
                <td className="text-center py-3 px-2"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-green-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-blue-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-purple-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Withdraw Earnings</td>
                <td className="text-center py-3 px-2"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-green-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-blue-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-purple-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2 flex items-center gap-1">
                  Verified Badge <BadgeCheck className="w-3 h-3 text-blue-500" />
                </td>
                <td className="text-center py-3 px-2"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-green-50/50"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-blue-50/50"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-purple-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2">Priority Support</td>
                <td className="text-center py-3 px-2"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-green-50/50"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-blue-50/50"><X className="w-4 h-4 text-gray-400 mx-auto" /></td>
                <td className="text-center py-3 px-2 bg-purple-50/50"><CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /></td>
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
                All subscriptions are one-time payments. Daily gives 1 day, Starter gives 15 days, Basic and Pro give 30 days of premium access.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens when my subscription expires?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                When your subscription expires, you'll return to the Free plan with 4 posts and 50 comments per day. You can resubscribe anytime.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">When can I withdraw my earnings?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                All paid subscribers (Daily, Starter, Basic, Pro) can withdraw earnings. Minimum withdrawal amount is ₦5,000.
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
