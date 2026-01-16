import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Gift, Users, TrendingUp } from 'lucide-react';

interface SignupBonusSettings {
  bonus_amount: number;
  is_enabled: boolean;
}

interface BonusStats {
  total_awarded: number;
  total_users: number;
  total_points_given: number;
}

export function AdminSignupBonusPage() {
  const [settings, setSettings] = useState<SignupBonusSettings>({
    bonus_amount: 0,
    is_enabled: false
  });
  const [stats, setStats] = useState<BonusStats>({
    total_awarded: 0,
    total_users: 0,
    total_points_given: 0
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
        .from('signup_bonus_settings')
        .select('bonus_amount, is_enabled')
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
      const { data, error } = await supabase
        .from('signup_bonus_history')
        .select('bonus_amount');

      if (error) throw error;

      const totalAwarded = data?.length || 0;
      const totalPointsGiven = data?.reduce((sum, item) => sum + item.bonus_amount, 0) || 0;

      // Get total users count
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      setStats({
        total_awarded: totalAwarded,
        total_users: count || 0,
        total_points_given: totalPointsGiven
      });
    } catch (err: any) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('signup_bonus_settings')
        .update({
          bonus_amount: settings.bonus_amount,
          is_enabled: settings.is_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('signup_bonus_settings').select('id').single()).data?.id);

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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Signup Bonus Settings</h1>
        <p className="text-gray-600">Configure points awarded to new users when they sign up</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_users}</div>
            <p className="text-xs text-gray-600 mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonuses Awarded</CardTitle>
            <Gift className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_awarded}</div>
            <p className="text-xs text-gray-600 mt-1">Users who received bonus</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points Given</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_points_given.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">Points distributed</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Bonus Configuration</CardTitle>
          <CardDescription>
            Set the amount of points new users receive upon signup and toggle the bonus system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="is_enabled" className="text-base font-medium">
                Enable Signup Bonus
              </Label>
              <p className="text-sm text-gray-600">
                When enabled, new users will automatically receive points upon registration
              </p>
            </div>
            <Switch
              id="is_enabled"
              checked={settings.is_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
            />
          </div>

          {/* Bonus Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="bonus_amount">Bonus Amount (Points)</Label>
            <Input
              id="bonus_amount"
              type="number"
              min="0"
              value={settings.bonus_amount}
              onChange={(e) => setSettings({ ...settings, bonus_amount: parseInt(e.target.value) || 0 })}
              placeholder="Enter points amount"
              className="max-w-xs"
            />
            <p className="text-sm text-gray-600">
              Number of points awarded to each new user
            </p>
          </div>

          {/* Preview */}
          {settings.is_enabled && settings.bonus_amount > 0 && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm font-medium text-purple-900">Preview:</p>
              <p className="text-sm text-purple-700 mt-1">
                New users will receive <strong>{settings.bonus_amount} points</strong> immediately upon signup
              </p>
            </div>
          )}

          {!settings.is_enabled && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                ⚠️ Signup bonus is currently disabled. New users will not receive any points.
              </p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
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
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bonuses */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Bonuses Awarded</CardTitle>
          <CardDescription>Latest signup bonuses given to new users</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentBonusesList />
        </CardContent>
      </Card>
    </div>
  );
}

function RecentBonusesList() {
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentBonuses();
  }, []);

  const fetchRecentBonuses = async () => {
    try {
      const { data, error } = await supabase
        .from('signup_bonus_history')
        .select(`
          id,
          bonus_amount,
          awarded_at,
          email_sent,
          user_id,
          users!inner(email, username, full_name)
        `)
        .order('awarded_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBonuses(data || []);
    } catch (err: any) {
      console.error('Error fetching recent bonuses:', err);
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

  if (bonuses.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No bonuses awarded yet</p>
    );
  }

  return (
    <div className="space-y-4">
      {bonuses.map((bonus) => (
        <div key={bonus.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">{bonus.users.full_name || bonus.users.username}</p>
              <p className="text-sm text-gray-600">{bonus.users.email}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-purple-600">+{bonus.bonus_amount} points</p>
            <p className="text-xs text-gray-500">
              {new Date(bonus.awarded_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
