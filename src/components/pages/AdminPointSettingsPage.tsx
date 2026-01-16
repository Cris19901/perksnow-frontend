import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Loader2, Save, RefreshCw, TrendingUp, Clock, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Header } from '../Header';

interface PointSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

export function AdminPointSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hourlyLimit, setHourlyLimit] = useState('100');
  const [limitsEnabled, setLimitsEnabled] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsersThisHour: 0,
    totalPointsThisHour: 0
  });

  useEffect(() => {
    checkAdminAccess();
    fetchSettings();
    fetchStats();
  }, []);

  const checkAdminAccess = async () => {
    if (!user) {
      toast.error('Please log in');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        // Optionally redirect to home page
      }
    } catch (err) {
      console.error('Error checking admin access:', err);
      toast.error('Failed to verify admin access');
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('point_settings')
        .select('*')
        .in('setting_key', ['hourly_point_limit', 'point_reset_enabled']);

      if (error) throw error;

      const settings = data as PointSetting[];
      settings.forEach(setting => {
        if (setting.setting_key === 'hourly_point_limit') {
          setHourlyLimit(setting.setting_value);
        } else if (setting.setting_key === 'point_reset_enabled') {
          setLimitsEnabled(setting.setting_value === 'true');
        }
      });
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total users count
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get current hour start time
      const currentHour = new Date();
      currentHour.setMinutes(0, 0, 0);

      // Get active users this hour (users who earned points)
      const { data: activeUsers } = await supabase
        .from('hourly_point_tracking')
        .select('user_id', { count: 'exact' })
        .gte('earning_hour', currentHour.toISOString());

      // Get total points earned this hour
      const { data: pointsData } = await supabase
        .from('hourly_point_tracking')
        .select('points_earned')
        .gte('earning_hour', currentHour.toISOString());

      const totalPoints = pointsData?.reduce((sum, record) => sum + record.points_earned, 0) || 0;
      const uniqueUsers = new Set(activeUsers?.map(u => u.user_id)).size;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsersThisHour: uniqueUsers,
        totalPointsThisHour: totalPoints
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Validate hourly limit
      const limitValue = parseInt(hourlyLimit);
      if (isNaN(limitValue) || limitValue < 0) {
        toast.error('Please enter a valid positive number for hourly limit');
        return;
      }

      if (limitValue > 10000) {
        toast.error('Hourly limit cannot exceed 10,000 points');
        return;
      }

      // Update hourly_point_limit
      const { error: limitError } = await supabase
        .from('point_settings')
        .update({ setting_value: hourlyLimit })
        .eq('setting_key', 'hourly_point_limit');

      if (limitError) throw limitError;

      // Update point_reset_enabled
      const { error: enabledError } = await supabase
        .from('point_settings')
        .update({ setting_value: limitsEnabled.toString() })
        .eq('setting_key', 'point_reset_enabled');

      if (enabledError) throw enabledError;

      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshStats = () => {
    fetchStats();
    toast.success('Stats refreshed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header currentPage="admin" />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="admin" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl mb-2">Point System Settings</h1>
          <p className="text-gray-600">
            Manage hourly point earning limits and system settings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-2xl">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active This Hour</p>
                <p className="text-2xl">{stats.activeUsersThisHour}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Points This Hour</p>
                <p className="text-2xl">{stats.totalPointsThisHour}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshStats}
              className="mt-2 w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </Card>
        </div>

        {/* Settings Form */}
        <Card className="p-6">
          <h2 className="text-xl mb-4">Point Limit Configuration</h2>

          <div className="space-y-6">
            {/* Enable/Disable Limits */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium mb-1">Enforce Hourly Limits</h3>
                <p className="text-sm text-gray-600">
                  When enabled, users cannot exceed the hourly point limit
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={limitsEnabled}
                  onChange={(e) => setLimitsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Hourly Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Hourly Point Limit
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(e.target.value)}
                    min="0"
                    max="10000"
                    className="w-full"
                    placeholder="Enter hourly limit"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum points a user can earn per hour (0-10,000)
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-900 mb-2">Current Configuration</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Limits Enabled: <strong>{limitsEnabled ? 'Yes' : 'No'}</strong></li>
                <li>• Hourly Limit: <strong>{hourlyLimit} points</strong></li>
                <li>• Reset Frequency: <strong>Every hour (automatic)</strong></li>
              </ul>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* Information Card */}
        <Card className="p-6 mt-6">
          <h2 className="text-xl mb-4">How It Works</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Hourly Tracking:</strong> The system tracks points earned by each user within each hour window (e.g., 2:00 PM - 3:00 PM).
            </p>
            <p>
              <strong>Automatic Reset:</strong> Point tracking automatically resets at the start of each new hour. No manual intervention required.
            </p>
            <p>
              <strong>Enforcement:</strong> When limits are enabled and a user reaches their hourly limit, they cannot earn more points until the next hour begins.
            </p>
            <p>
              <strong>Admin Override:</strong> Disabling limits allows users to earn unlimited points per hour.
            </p>
            <p>
              <strong>Data Retention:</strong> Point tracking history is automatically cleaned up after 7 days to maintain database performance.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
