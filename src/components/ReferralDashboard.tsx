import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Copy, Check, Users, Gift, DollarSign, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_points_earned: number;
  total_money_earned: number;
  referral_code: string;
}

interface Referral {
  id: string;
  status: string;
  total_points_earned: number;
  total_percentage_earned: number;
  deposits_tracked: number;
  created_at: string;
  referee: {
    username: string;
    full_name: string;
  };
}

export function ReferralDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchReferrals();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_referral_stats', { p_user_id: user.id });

      if (error) throw error;

      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          total_points_earned,
          total_percentage_earned,
          deposits_tracked,
          created_at,
          referee:referee_id(username, full_name)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals(data || []);
    } catch (err: any) {
      console.error('Error fetching referrals:', err);
    }
  };

  const copyReferralLink = () => {
    if (!stats?.referral_code) return;

    const referralLink = `${window.location.origin}/signup?ref=${stats.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied to clipboard!');

    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    if (!stats?.referral_code) return;

    navigator.clipboard.writeText(stats.referral_code);
    setCopied(true);
    toast.success('Referral code copied!');

    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>Unable to load referral data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Link Card */}
      <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <CardHeader>
          <CardTitle className="text-white">Your Referral Code</CardTitle>
          <CardDescription className="text-purple-100">
            Share this code or link to earn rewards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Referral Code */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-center tracking-wider">{stats.referral_code}</p>
              </div>
              <Button
                onClick={copyReferralCode}
                variant="secondary"
                size="icon"
                className="h-12 w-12"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <p className="text-sm text-purple-100 mb-2">Full Referral Link:</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <p className="text-sm font-mono truncate">
                  {window.location.origin}/signup?ref={stats.referral_code}
                </p>
              </div>
              <Button
                onClick={copyReferralLink}
                variant="secondary"
                size="sm"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_referrals}</div>
            <p className="text-xs text-gray-600 mt-1">People you've referred</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_referrals}</div>
            <p className="text-xs text-gray-600 mt-1">Currently earning from</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Earned</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_points_earned.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">From all referrals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_money_earned.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">From deposit commissions</p>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Referrals Work</CardTitle>
          <CardDescription>Earn rewards when your friends join and deposit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium">Share Your Code</p>
                <p className="text-sm text-gray-600">
                  Share your referral code or link with friends
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium">They Sign Up</p>
                <p className="text-sm text-gray-600">
                  When someone signs up with your code, you earn points instantly
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium">They Deposit</p>
                <p className="text-sm text-gray-600">
                  Earn points + percentage of their deposits (up to 10 deposits per referral)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Track your referral earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No referrals yet</p>
              <p className="text-sm mt-1">Start sharing your referral code to earn rewards!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">
                      {referral.referee.full_name || referral.referee.username}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: <span className="capitalize">{referral.status}</span>
                      {' • '}
                      {referral.deposits_tracked} deposits tracked
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Joined {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-purple-600">
                      {referral.total_points_earned} pts
                    </p>
                    <p className="text-sm text-green-600">
                      ${Number(referral.total_percentage_earned).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
