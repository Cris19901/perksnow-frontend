import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface SubscriptionStats {
  totalSubscribers: number;
  activeSubscribers: number;
  expiredSubscribers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageSubscriptionValue: number;
  churnRate: number;
  retentionRate: number;
}

interface PlanBreakdown {
  plan_name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface RecentTransaction {
  id: string;
  reference: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  user: {
    username: string;
    full_name: string;
    email: string;
  };
  subscription: {
    plan_name: string;
    billing_cycle: string;
  };
}

interface ExpiringSubscription {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  subscription_tier: string;
  subscription_expires_at: string;
  days_until_expiry: number;
}

export function AdminSubscriptionAnalytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubscriptionStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    expiredSubscribers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageSubscriptionValue: 0,
    churnRate: 0,
    retentionRate: 0,
  });
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdown[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscription[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch subscription stats
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status, subscription_expires_at, created_at');

      if (usersError) throw usersError;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalSubscribers = users?.filter(u => u.subscription_tier !== 'free').length || 0;
      const activeSubscribers = users?.filter(
        u => u.subscription_status === 'active' && u.subscription_tier !== 'free'
      ).length || 0;
      const expiredSubscribers = users?.filter(
        u => u.subscription_status === 'inactive' && u.subscription_tier === 'free'
      ).length || 0;

      // Fetch payment transactions
      const { data: transactions, error: txError } = await supabase
        .from('payment_transactions')
        .select('amount, status, created_at, paid_at')
        .eq('status', 'success');

      if (txError) throw txError;

      const totalRevenue = transactions?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
      const monthlyRevenue = transactions
        ?.filter(tx => new Date(tx.created_at) >= thirtyDaysAgo)
        .reduce((sum, tx) => sum + tx.amount, 0) || 0;

      const averageSubscriptionValue = totalSubscribers > 0 ? totalRevenue / totalSubscribers : 0;
      const churnRate = totalSubscribers > 0 ? (expiredSubscribers / totalSubscribers) * 100 : 0;
      const retentionRate = 100 - churnRate;

      setStats({
        totalSubscribers,
        activeSubscribers,
        expiredSubscribers,
        totalRevenue,
        monthlyRevenue,
        averageSubscriptionValue,
        churnRate,
        retentionRate,
      });

      // Fetch plan breakdown
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('plan_name, status')
        .eq('status', 'active');

      if (subError) throw subError;

      const planCounts: Record<string, { count: number; revenue: number }> = {};
      subscriptions?.forEach(sub => {
        if (!planCounts[sub.plan_name]) {
          planCounts[sub.plan_name] = { count: 0, revenue: 0 };
        }
        planCounts[sub.plan_name].count++;
      });

      // Get revenue per plan from transactions
      const { data: txWithPlans, error: txPlanError } = await supabase
        .from('payment_transactions')
        .select(`
          amount,
          subscriptions (
            plan_name
          )
        `)
        .eq('status', 'success');

      if (!txPlanError && txWithPlans) {
        txWithPlans.forEach(tx => {
          const planName = (tx.subscriptions as any)?.plan_name;
          if (planName && planCounts[planName]) {
            planCounts[planName].revenue += tx.amount;
          }
        });
      }

      const totalSubs = Object.values(planCounts).reduce((sum, p) => sum + p.count, 0);
      const breakdown = Object.entries(planCounts).map(([plan, data]) => ({
        plan_name: plan,
        count: data.count,
        revenue: data.revenue,
        percentage: totalSubs > 0 ? (data.count / totalSubs) * 100 : 0,
      }));

      setPlanBreakdown(breakdown);

      // Fetch recent transactions with user data in a SINGLE query (fixes N+1 problem)
      const { data: recentTx, error: recentError } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          reference,
          amount,
          status,
          created_at,
          paid_at,
          user_id,
          subscription_id,
          users!user_id (
            username,
            full_name,
            email
          ),
          subscriptions (
            plan_name,
            billing_cycle
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recentError && recentTx) {
        // Map the joined data to the expected format
        const txWithUsers = recentTx.map((tx: any) => ({
          ...tx,
          user: tx.users || { username: 'Unknown', full_name: 'Unknown', email: '' },
          subscription: tx.subscriptions || { plan_name: 'Unknown', billing_cycle: 'Unknown' },
        }));
        setRecentTransactions(txWithUsers);
      }

      // Fetch expiring subscriptions (next 7 days)
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data: expiring, error: expiringError } = await supabase
        .from('users')
        .select('id, username, full_name, email, subscription_tier, subscription_expires_at')
        .eq('subscription_status', 'active')
        .neq('subscription_tier', 'free')
        .lte('subscription_expires_at', sevenDaysFromNow.toISOString())
        .gte('subscription_expires_at', now.toISOString())
        .order('subscription_expires_at', { ascending: true });

      if (!expiringError && expiring) {
        const expiringWithDays = expiring.map(sub => ({
          ...sub,
          user_id: sub.id,
          days_until_expiry: Math.ceil(
            (new Date(sub.subscription_expires_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          ),
        }));
        setExpiringSubscriptions(expiringWithDays);
      }

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${(amount / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Plan', 'Subscribers', 'Revenue', 'Percentage'],
      ...planBreakdown.map(p => [
        p.plan_name,
        p.count.toString(),
        formatCurrency(p.revenue),
        `${p.percentage.toFixed(1)}%`,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Report exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onCartClick={() => {}} cartItemsCount={0} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onCartClick={() => {}} cartItemsCount={0} />

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Subscription Analytics</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor subscription performance and revenue
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeSubscribers}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalSubscribers} total subscribers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(stats.monthlyRevenue)} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg. Subscription Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatCurrency(stats.averageSubscriptionValue)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Per subscriber</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Retention Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.retentionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.churnRate.toFixed(1)}% churn rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Plan Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plans Breakdown</CardTitle>
                <CardDescription>Distribution of active subscriptions by plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {planBreakdown.map((plan) => (
                    <div key={plan.plan_name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="capitalize">
                            {plan.plan_name}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {plan.count} subscribers
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(plan.revenue)}</div>
                          <div className="text-xs text-gray-500">{plan.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${plan.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest subscription payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            tx.status === 'success'
                              ? 'bg-green-500'
                              : tx.status === 'failed'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}
                        />
                        <div>
                          <div className="font-medium">{tx.user.full_name || tx.user.username}</div>
                          <div className="text-sm text-gray-500">{tx.user.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(tx.amount)}</div>
                        <div className="text-xs text-gray-500">
                          {tx.subscription.plan_name} - {tx.subscription.billing_cycle}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expiring Subscriptions</CardTitle>
                <CardDescription>Subscriptions expiring in the next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {expiringSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No subscriptions expiring in the next 7 days
                  </div>
                ) : (
                  <div className="space-y-4">
                    {expiringSubscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{sub.full_name || sub.username}</div>
                          <div className="text-sm text-gray-500">{sub.email}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="capitalize">
                            {sub.subscription_tier}
                          </Badge>
                          <div
                            className={`text-sm mt-1 ${
                              sub.days_until_expiry <= 2
                                ? 'text-red-600 font-semibold'
                                : 'text-yellow-600'
                            }`}
                          >
                            {sub.days_until_expiry} day{sub.days_until_expiry !== 1 ? 's' : ''} left
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(sub.subscription_expires_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
