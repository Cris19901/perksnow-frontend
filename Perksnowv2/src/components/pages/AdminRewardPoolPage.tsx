import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { DollarSign, TrendingUp, Calendar, Users, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';

interface RewardPool {
  id: string;
  total_amount: number;
  period_name: string;
  period_start: string;
  period_end: string;
  is_active: boolean;
  description: string;
  created_at: string;
}

interface AdminRewardPoolPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function AdminRewardPoolPage({ onCartClick, cartItemsCount }: AdminRewardPoolPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { formatPriceInUSD } = useCurrency();

  const [pools, setPools] = useState<RewardPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    total_amount: '',
    period_name: '',
    period_start: '',
    period_end: '',
    description: '',
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    fetchRewardPools();
  }, [user, authLoading, navigate]);

  const fetchRewardPools = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('reward_pool')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPools(data || []);
    } catch (err) {
      console.error('Error fetching reward pools:', err);
      toast.error('Failed to load reward pools');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePool = async () => {
    if (!formData.total_amount || !formData.period_name || !formData.period_start || !formData.period_end) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.total_amount);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setCreating(true);

      // Prepare insert data
      const insertData: any = {
        total_amount: amount,
        period_name: formData.period_name,
        period_start: formData.period_start,
        period_end: formData.period_end,
        description: formData.description,
        is_active: true,
      };

      // Only add created_by if user exists
      if (user?.id) {
        insertData.created_by = user.id;
      }

      const { data, error } = await supabase.from('reward_pool').insert(insertData).select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast.success('Reward pool created successfully!');
      setDialogOpen(false);
      setFormData({
        total_amount: '',
        period_name: '',
        period_start: '',
        period_end: '',
        description: '',
      });
      fetchRewardPools();
    } catch (err: any) {
      console.error('Error creating reward pool:', err);

      // Show specific error message
      if (err.message) {
        toast.error(`Error: ${err.message}`);
      } else if (err.code) {
        toast.error(`Database error (${err.code}). Check console for details.`);
      } else {
        toast.error('Failed to create reward pool');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (poolId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('reward_pool')
        .update({ is_active: !currentStatus })
        .eq('id', poolId);

      if (error) throw error;

      toast.success(`Pool ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchRewardPools();
    } catch (err) {
      console.error('Error toggling pool status:', err);
      toast.error('Failed to update pool status');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/admin')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                ←
              </button>
              <DollarSign className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold">Reward Pool Management</h1>
            </div>
            <p className="text-gray-600">
              Create and manage reward pools for distributing earnings to users
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                Create New Pool
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Reward Pool</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="total_amount">Total Amount (USD) *</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    placeholder="1000.00"
                  />
                </div>

                <div>
                  <Label htmlFor="period_name">Period Name *</Label>
                  <Input
                    id="period_name"
                    value={formData.period_name}
                    onChange={(e) => setFormData({ ...formData, period_name: e.target.value })}
                    placeholder="e.g., January 2025"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="period_start">Start Date *</Label>
                    <Input
                      id="period_start"
                      type="date"
                      value={formData.period_start}
                      onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="period_end">End Date *</Label>
                    <Input
                      id="period_end"
                      type="date"
                      value={formData.period_end}
                      onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleCreatePool}
                  disabled={creating}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {creating ? 'Creating...' : 'Create Pool'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reward pools...</p>
          </div>
        )}

        {/* Pools List */}
        {!loading && (
          <div className="space-y-4">
            {pools.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No reward pools yet</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first reward pool to start distributing earnings
                  </p>
                </CardContent>
              </Card>
            ) : (
              pools.map((pool) => (
                <Card key={pool.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{pool.period_name}</CardTitle>
                        <CardDescription>{pool.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            pool.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pool.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(pool.id, pool.is_active)}
                        >
                          {pool.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Pool</p>
                          <p className="text-xl font-bold">{formatPriceInUSD(pool.total_amount)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Period</p>
                          <p className="font-medium">
                            {formatDate(pool.period_start)} - {formatDate(pool.period_end)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Created</p>
                          <p className="font-medium">{formatDate(pool.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
