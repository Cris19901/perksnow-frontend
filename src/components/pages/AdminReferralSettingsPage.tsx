import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Users, TrendingUp, DollarSign, Gift, Link as LinkIcon } from 'lucide-react';

interface ReferralSettings {
  points_per_signup: number;
  signup_points_enabled: boolean;
  points_per_deposit: number;
  deposit_points_enabled: boolean;
  percentage_per_deposit: number;
  percentage_reward_enabled: boolean;
  max_earnings_count: number;
  min_deposit_amount: number;
  is_enabled: boolean;
}

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_points_awarded: number;
  total_money_awarded: number;
  total_deposits_tracked: number;
}

export function AdminReferralSettingsPage() {
  const [settings, setSettings] = useState<ReferralSettings>({
    points_per_signup: 0,
    signup_points_enabled: false,
    points_per_deposit: 0,
    deposit_points_enabled: false,
    percentage_per_deposit: 0,
    percentage_reward_enabled: false,
    max_earnings_count: 10,
    min_deposit_amount: 10,
    is_enabled: false
  });
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    active_referrals: 0,
    total_points_awarded: 0,
    total_money_awarded: 0,
    total_deposits_tracked: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data);
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select('id, status, total_points_earned, total_percentage_earned, deposits_tracked');

      if (referralsError) throw referralsError;

      const totalReferrals = referralsData?.length || 0;
      const activeReferrals = referralsData?.filter(r => r.status === 'active').length || 0;
      const totalPointsAwarded = referralsData?.reduce((sum, r) => sum + (r.total_points_earned || 0), 0) || 0;
      const totalMoneyAwarded = referralsData?.reduce((sum, r) => sum + Number(r.total_percentage_earned || 0), 0) || 0;
      const totalDepositsTracked = referralsData?.reduce((sum, r) => sum + (r.deposits_tracked || 0), 0) || 0;

      setStats({
        total_referrals: totalReferrals,
        active_referrals: activeReferrals,
        total_points_awarded: totalPointsAwarded,
        total_money_awarded: totalMoneyAwarded,
        total_deposits_tracked: totalDepositsTracked
      });
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('referral_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('referral_settings').select('id').single()).data?.id);

      if (error) throw error;

      toast.success('Settings saved successfully!');
      fetchStats(); // Refresh stats after saving
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Referral System Settings</h1>
        <p className="text-gray-600">Configure rewards for referrals and track performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_referrals}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.active_referrals} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Points Awarded</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_points_awarded.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">To all referrers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money Awarded</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.total_money_awarded.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">From deposits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposits Tracked</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_deposits_tracked}</div>
            <p className="text-xs text-gray-600 mt-1">Total deposits processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="points">Points Rewards</TabsTrigger>
          <TabsTrigger value="percentage">Percentage Rewards</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Enable/disable the referral system and set basic parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable System */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="is_enabled" className="text-base font-medium">
                    Enable Referral System
                  </Label>
                  <p className="text-sm text-gray-600">
                    When enabled, users can refer others and earn rewards
                  </p>
                </div>
                <Switch
                  id="is_enabled"
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
                />
              </div>

              {/* Minimum Deposit Amount */}
              <div className="space-y-2">
                <Label htmlFor="min_deposit_amount">Minimum Deposit Amount ($)</Label>
                <Input
                  id="min_deposit_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.min_deposit_amount}
                  onChange={(e) => setSettings({ ...settings, min_deposit_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter minimum amount"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-600">
                  Minimum deposit amount to trigger referral rewards
                </p>
              </div>

              {!settings.is_enabled && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">
                    ⚠️ Referral system is currently disabled. Users will not earn any rewards.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points Rewards Tab */}
        <TabsContent value="points">
          <div className="space-y-6">
            {/* Signup Points Card */}
            <Card>
              <CardHeader>
                <CardTitle>Signup Points Reward</CardTitle>
                <CardDescription>
                  Award points when someone signs up using a referral code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Signup Points */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="signup_points_enabled" className="text-base font-medium">
                      Enable Signup Points
                    </Label>
                    <p className="text-sm text-gray-600">
                      Reward referrers with points when someone signs up
                    </p>
                  </div>
                  <Switch
                    id="signup_points_enabled"
                    checked={settings.signup_points_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, signup_points_enabled: checked })}
                  />
                </div>

                {/* Points per Signup */}
                <div className="space-y-2">
                  <Label htmlFor="points_per_signup">Points per Signup</Label>
                  <Input
                    id="points_per_signup"
                    type="number"
                    min="0"
                    value={settings.points_per_signup}
                    onChange={(e) => setSettings({ ...settings, points_per_signup: parseInt(e.target.value) || 0 })}
                    placeholder="Enter points amount"
                    className="max-w-xs"
                  />
                  <p className="text-sm text-gray-600">
                    Number of points awarded when someone signs up
                  </p>
                </div>

                {/* Preview */}
                {settings.signup_points_enabled && settings.points_per_signup > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">Preview:</p>
                    <p className="text-sm text-purple-700 mt-1">
                      When someone signs up with a referral code, the referrer gets <strong>{settings.points_per_signup} points</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deposit Points Card */}
            <Card>
              <CardHeader>
                <CardTitle>Deposit Points Reward</CardTitle>
                <CardDescription>
                  Award points when a referred user makes their first deposit
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Deposit Points */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="deposit_points_enabled" className="text-base font-medium">
                      Enable Deposit Points
                    </Label>
                    <p className="text-sm text-gray-600">
                      Reward referrers with points when their referral makes a deposit
                    </p>
                  </div>
                  <Switch
                    id="deposit_points_enabled"
                    checked={settings.deposit_points_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, deposit_points_enabled: checked })}
                  />
                </div>

                {/* Points per Deposit */}
                <div className="space-y-2">
                  <Label htmlFor="points_per_deposit">Points per Deposit</Label>
                  <Input
                    id="points_per_deposit"
                    type="number"
                    min="0"
                    value={settings.points_per_deposit}
                    onChange={(e) => setSettings({ ...settings, points_per_deposit: parseInt(e.target.value) || 0 })}
                    placeholder="Enter points amount"
                    className="max-w-xs"
                  />
                  <p className="text-sm text-gray-600">
                    Number of points awarded for first deposit
                  </p>
                </div>

                {/* Preview */}
                {settings.deposit_points_enabled && settings.points_per_deposit > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-medium text-purple-900">Preview:</p>
                    <p className="text-sm text-purple-700 mt-1">
                      When a referred user makes their first deposit, the referrer gets <strong>{settings.points_per_deposit} points</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Percentage Rewards Tab */}
        <TabsContent value="percentage">
          <Card>
            <CardHeader>
              <CardTitle>Percentage-Based Earnings</CardTitle>
              <CardDescription>
                Award a percentage of referred users' deposits (up to a maximum number of deposits)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable Percentage Rewards */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="percentage_reward_enabled" className="text-base font-medium">
                    Enable Percentage Rewards
                  </Label>
                  <p className="text-sm text-gray-600">
                    Reward referrers with a percentage of their referrals' deposits
                  </p>
                </div>
                <Switch
                  id="percentage_reward_enabled"
                  checked={settings.percentage_reward_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, percentage_reward_enabled: checked })}
                />
              </div>

              {/* Percentage per Deposit */}
              <div className="space-y-2">
                <Label htmlFor="percentage_per_deposit">Percentage per Deposit (%)</Label>
                <Input
                  id="percentage_per_deposit"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.percentage_per_deposit}
                  onChange={(e) => setSettings({ ...settings, percentage_per_deposit: parseFloat(e.target.value) || 0 })}
                  placeholder="Enter percentage"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-600">
                  Percentage of each deposit awarded to the referrer
                </p>
              </div>

              {/* Max Earnings Count */}
              <div className="space-y-2">
                <Label htmlFor="max_earnings_count">Maximum Deposits Tracked</Label>
                <Input
                  id="max_earnings_count"
                  type="number"
                  min="1"
                  value={settings.max_earnings_count}
                  onChange={(e) => setSettings({ ...settings, max_earnings_count: parseInt(e.target.value) || 1 })}
                  placeholder="Enter max count"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-600">
                  Maximum number of deposits to earn percentage from (per referral)
                </p>
              </div>

              {/* Preview */}
              {settings.percentage_reward_enabled && settings.percentage_per_deposit > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">Preview:</p>
                  <p className="text-sm text-green-700 mt-1">
                    Referrers earn <strong>{settings.percentage_per_deposit}%</strong> of their referrals' deposits, up to <strong>{settings.max_earnings_count} deposits</strong> per referral.
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    Example: If a referral deposits $100, the referrer earns ${(100 * settings.percentage_per_deposit / 100).toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save All Settings'
          )}
        </Button>
      </div>

      {/* Recent Referrals */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
          <CardDescription>Latest referral activities</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentReferralsList />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentReferralsList() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentReferrals();
  }, []);

  const fetchRecentReferrals = async () => {
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
          referrer:referrer_id(email, username, full_name),
          referee:referee_id(email, username, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReferrals(data || []);
    } catch (err: any) {
      console.error('Error fetching recent referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No referrals yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {referrals.map((referral) => (
        <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">
                {referral.referrer?.full_name || referral.referrer?.username} → {referral.referee?.full_name || referral.referee?.username}
              </p>
              <p className="text-sm text-gray-600">
                Status: <span className="capitalize">{referral.status}</span> • Deposits: {referral.deposits_tracked}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-purple-600">{referral.total_points_earned} points</p>
            <p className="text-sm text-green-600">${Number(referral.total_percentage_earned).toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              {new Date(referral.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
