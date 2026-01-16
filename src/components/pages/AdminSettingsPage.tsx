import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Settings,
  DollarSign,
  TrendingUp,
  Zap,
  Save,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { MobileBottomNav } from '../MobileBottomNav';

interface AdminSettingsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Setting {
  setting_key: string;
  setting_value: { value: number };
  setting_category: string;
  description: string;
}

export function AdminSettingsPage({ onNavigate, onCartClick, cartItemsCount }: AdminSettingsPageProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changes, setChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('setting_category, setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setChanges(prev => ({ ...prev, [key]: numValue }));
  };

  const getValue = (setting: Setting) => {
    return changes[setting.setting_key] ?? setting.setting_value.value;
  };

  const hasChanges = () => {
    return Object.keys(changes).length > 0;
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      for (const [key, value] of Object.entries(changes)) {
        const { error } = await supabase.rpc('update_setting', {
          p_setting_key: key,
          p_setting_value: { value },
          p_user_id: user.id
        });

        if (error) throw error;
      }

      toast.success('Settings saved successfully!');
      setChanges({});
      fetchSettings();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChanges({});
    toast.info('Changes discarded');
  };

  const renderSettingsByCategory = (category: string) => {
    const categorySettings = settings.filter(s => s.setting_category === category);

    if (categorySettings.length === 0) {
      return <p className="text-gray-500">No settings in this category</p>;
    }

    return (
      <div className="space-y-4">
        {categorySettings.map((setting) => (
          <div key={setting.setting_key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium">{setting.description}</Label>
              <p className="text-xs text-gray-500 mt-1">{setting.setting_key}</p>
            </div>
            <Input
              type="number"
              value={getValue(setting)}
              onChange={(e) => handleChange(setting.setting_key, e.target.value)}
              className="w-32"
              min="0"
            />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="admin"
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="admin"
      />

      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8 text-purple-600" />
              Admin Settings
            </h1>
            <p className="text-gray-600 mt-1">Configure point values and system limits</p>
          </div>

          {hasChanges() && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Warning Banner */}
        <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">Important</h3>
              <p className="text-sm text-amber-800 mt-1">
                Changes to point values will affect all future transactions. Existing points balances will not be modified.
                Make sure to test changes carefully before saving.
              </p>
            </div>
          </div>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="points" className="space-y-6">
          <TabsList className="bg-white border border-gray-200 grid w-full grid-cols-3">
            <TabsTrigger value="points" className="gap-2">
              <Zap className="w-4 h-4" />
              Point Rewards
            </TabsTrigger>
            <TabsTrigger value="limits" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Limits
            </TabsTrigger>
            <TabsTrigger value="conversion" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Conversion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="points">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Point Rewards</h2>
                <p className="text-sm text-gray-600">Configure how many points users earn for different actions</p>
              </div>
              {renderSettingsByCategory('points')}
            </Card>
          </TabsContent>

          <TabsContent value="limits">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Daily & Hourly Limits</h2>
                <p className="text-sm text-gray-600">Set maximum points users can earn per day/hour to prevent abuse</p>
              </div>
              {renderSettingsByCategory('limits')}
            </Card>
          </TabsContent>

          <TabsContent value="conversion">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Conversion Settings</h2>
                <p className="text-sm text-gray-600">Configure point-to-currency conversion and withdrawal minimums</p>
              </div>
              {renderSettingsByCategory('conversion')}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Current Conversion Rate</h3>
                <p className="text-sm text-blue-800">
                  {settings.find(s => s.setting_key === 'points_to_currency_rate')?.setting_value.value || 10} points = 1 NGN
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Example: 1,000 points = {1000 / (settings.find(s => s.setting_key === 'points_to_currency_rate')?.setting_value.value || 10)} NGN
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Post Creation</p>
                <p className="text-2xl font-bold text-purple-600">
                  {settings.find(s => s.setting_key === 'points_post_created')?.setting_value.value || 0}
                </p>
                <p className="text-xs text-gray-500">points per post</p>
              </div>
              <Zap className="w-8 h-8 text-purple-200" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Daily Limit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {settings.find(s => s.setting_key === 'points_daily_limit')?.setting_value.value || 0}
                </p>
                <p className="text-xs text-gray-500">points per day</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-200" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {settings.find(s => s.setting_key === 'points_to_currency_rate')?.setting_value.value || 0}:1
                </p>
                <p className="text-xs text-gray-500">points to NGN</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </Card>
        </div>
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
    </div>
  );
}
