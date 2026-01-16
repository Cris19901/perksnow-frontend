import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Share2,
  Users,
  TrendingUp,
  Wallet,
  CheckCircle2,
  Clock,
  DollarSign,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  active_referrals: number;
  total_points_earned: number;
  total_money_earned: number;
  wallet_balance: number;
}

interface Referral {
  id: string;
  referred_user: string;
  status: string;
  total_points_earned: number;
  total_percentage_earned: number;
  deposits_tracked: number;
  created_at: string;
}

export function ReferralDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralData();
    }
  }, [user]);

  const fetchReferralData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Fetch user's referral code and wallet balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('referral_code, wallet_balance, points_balance')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Fetch referral stats
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          id,
          referee_id,
          status,
          total_points_earned,
          total_percentage_earned,
          deposits_tracked,
          created_at
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) throw referralsError;

      // Get referred users' usernames
      const referralsList: Referral[] = [];
      if (referralsData && referralsData.length > 0) {
        for (const ref of referralsData) {
          const { data: refUser } = await supabase
            .from('users')
            .select('username')
            .eq('id', ref.referee_id)
            .single();

          referralsList.push({
            id: ref.id,
            referred_user: refUser?.username || 'Unknown',
            status: ref.status,
            total_points_earned: ref.total_points_earned || 0,
            total_percentage_earned: ref.total_percentage_earned || 0,
            deposits_tracked: ref.deposits_tracked || 0,
            created_at: ref.created_at,
          });
        }
      }

      // Calculate totals
      const totalReferrals = referralsList.length;
      const activeReferrals = referralsList.filter(
        r => r.status === 'active' || r.status === 'completed'
      ).length;
      const totalPointsEarned = referralsList.reduce(
        (sum, r) => sum + r.total_points_earned,
        0
      );
      const totalMoneyEarned = referralsList.reduce(
        (sum, r) => sum + r.total_percentage_earned,
        0
      );

      setStats({
        referral_code: userData?.referral_code || '',
        total_referrals: totalReferrals,
        active_referrals: activeReferrals,
        total_points_earned: totalPointsEarned,
        total_money_earned: totalMoneyEarned,
        wallet_balance: userData?.wallet_balance || 0,
      });

      setReferrals(referralsList);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (stats?.referral_code) {
      navigator.clipboard.writeText(stats.referral_code);
      toast.success('Referral code copied!');
    }
  };

  const copyReferralLink = () => {
    if (stats?.referral_code) {
      const link = `https://lavlay.com/signup?ref=${stats.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied!');
    }
  };

  const shareToWhatsApp = () => {
    if (stats?.referral_code) {
      const link = `https://lavlay.com/signup?ref=${stats.referral_code}`;
      const message = `Join LavLay using my referral code and start earning! ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const shareToTwitter = () => {
    if (stats?.referral_code) {
      const link = `https://lavlay.com/signup?ref=${stats.referral_code}`;
      const message = `Join LavLay and start earning! Use my referral code: ${stats.referral_code}`;
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(link)}`,
        '_blank'
      );
    }
  };

  const shareToFacebook = () => {
    if (stats?.referral_code) {
      const link = `https://lavlay.com/signup?ref=${stats.referral_code}`;
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
        '_blank'
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Referral Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Invite friends and earn rewards for every signup and deposit
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_referrals || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.active_referrals || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_points_earned || 0}</div>
              <p className="text-xs text-muted-foreground">From referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Money Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.total_money_earned || 0)}
              </div>
              <p className="text-xs text-muted-foreground">5% commission</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats?.wallet_balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-purple-600"
                  onClick={() => window.location.href = '/withdraw'}
                >
                  Withdraw →
                </Button>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Referral Code</CardTitle>
            <CardDescription>
              Share your code with friends and earn 20 points per signup + 5% commission
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Referral Code */}
              <div className="flex gap-2">
                <Input
                  value={stats?.referral_code || ''}
                  readOnly
                  className="font-mono text-lg font-bold"
                />
                <Button onClick={copyReferralCode} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>

              {/* Referral Link */}
              <div className="flex gap-2">
                <Input
                  value={`https://lavlay.com/signup?ref=${stats?.referral_code || ''}`}
                  readOnly
                  className="text-sm"
                />
                <Button onClick={copyReferralLink} variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button onClick={shareToWhatsApp} variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button onClick={shareToTwitter} variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button onClick={shareToFacebook} variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle>How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center mb-3">
                  1
                </div>
                <h3 className="font-semibold mb-2">Share Your Code</h3>
                <p className="text-sm text-gray-600">
                  Share your referral link with friends via WhatsApp, Twitter, or Facebook
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center mb-3">
                  2
                </div>
                <h3 className="font-semibold mb-2">They Sign Up</h3>
                <p className="text-sm text-gray-600">
                  When they sign up using your code, you earn 20 points instantly
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center mb-3">
                  3
                </div>
                <h3 className="font-semibold mb-2">Earn Commission</h3>
                <p className="text-sm text-gray-600">
                  Earn 50 points + 5% of their deposits (first 10 deposits per referral)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>
              Track all your referrals and their activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No referrals yet</h3>
                <p className="text-gray-600 mb-4">
                  Share your referral code to start earning
                </p>
                <Button onClick={copyReferralLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Referral Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">@{referral.referred_user}</span>
                        {getStatusBadge(referral.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        Joined {formatDate(referral.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        +{referral.total_points_earned} points
                      </div>
                      {referral.total_percentage_earned > 0 && (
                        <div className="text-sm text-gray-600">
                          {formatCurrency(referral.total_percentage_earned)} earned
                        </div>
                      )}
                      {referral.deposits_tracked > 0 && (
                        <div className="text-xs text-gray-500">
                          {referral.deposits_tracked} deposits tracked
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
