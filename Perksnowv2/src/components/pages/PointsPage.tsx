import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { PointsDisplay } from '../PointsDisplay';
import { MobileBottomNav } from '../MobileBottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Coins, TrendingUp, TrendingDown, Award, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PointsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Transaction {
  id: string;
  points: number;
  transaction_type: string;
  source: string;
  description: string | null;
  created_at: string;
}

export function PointsPage({ onNavigate, onCartClick, cartItemsCount }: PointsPageProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversionAmount, setConversionAmount] = useState('');
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointValue, setPointValue] = useState<{
    user_points: number;
    total_system_points: number;
    pool_amount: number;
    user_monetary_value: number;
    value_per_point: number;
    user_percentage: number;
  } | null>(null);

  const conversionRate = pointValue?.value_per_point || 0.01; // Dynamic rate from reward pool

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchPointsBalance();
      fetchPointValue();
    }
  }, [user]);

  const fetchPointsBalance = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setPointsBalance(data?.points_balance || 0);
    } catch (err) {
      console.error('Error fetching points balance:', err);
    }
  };

  const fetchPointValue = async () => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_user_point_value', { p_user_id: user?.id });

      if (error) {
        console.error('Error calculating point value:', error);
        return;
      }

      if (data && data.length > 0) {
        setPointValue(data[0]);
      }
    } catch (err) {
      console.error('Error fetching point value:', err);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleConversionRequest = async () => {
    const pointsToConvert = parseInt(conversionAmount);

    if (!pointsToConvert || pointsToConvert < 100) {
      toast.error('Minimum 100 points required');
      return;
    }

    if (pointsToConvert > pointsBalance) {
      toast.error('Insufficient points balance');
      return;
    }

    try {
      setSubmitting(true);

      const cashAmount = pointsToConvert * conversionRate;

      const { error } = await supabase.from('points_conversion_requests').insert({
        user_id: user?.id,
        points_amount: pointsToConvert,
        cash_amount: cashAmount,
        conversion_rate: conversionRate,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Conversion request submitted! We will process it soon.');
      setConversionDialogOpen(false);
      setConversionAmount('');
      fetchTransactions();
    } catch (err: any) {
      console.error('Error submitting conversion request:', err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      post_created: 'Post Created',
      like_received: 'Like Received',
      comment_received: 'Comment Received',
      follow_received: 'New Follower',
      product_sold: 'Product Sold',
      daily_bonus: 'Daily Bonus',
      referral: 'Referral',
      cash_conversion: 'Converted to Cash',
      admin_adjustment: 'Admin Adjustment',
    };
    return labels[source] || source;
  };

  const estimatedCash = conversionAmount
    ? (parseInt(conversionAmount) * conversionRate).toFixed(2)
    : '0.00';

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="points"
        />
        <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-6">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Log in to view points</h2>
            <p className="text-gray-600 mb-6">
              Earn reward points for your activities and convert them to cash!
            </p>
            <button
              onClick={() => onNavigate?.('login')}
              className="text-purple-600 hover:underline font-medium"
            >
              Log in to continue
            </button>
          </div>
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
        currentPage="points"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Reward Points</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Earn points and convert them to cash
          </p>
        </div>

        <div className="grid lg:grid-cols-[350px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <PointsDisplay
              showConvertButton
              onConvertClick={() => setConversionDialogOpen(true)}
            />

            {/* Conversion Dialog */}
            <Dialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convert Points to Cash</DialogTitle>
                  <DialogDescription>
                    Convert your reward points to USD. Minimum 100 points required.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="points">Points to Convert</Label>
                    <Input
                      id="points"
                      type="number"
                      min="100"
                      max={pointsBalance}
                      value={conversionAmount}
                      onChange={(e) => setConversionAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Available: {pointsBalance.toLocaleString()} points
                    </p>
                  </div>

                  {conversionAmount && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">You will receive:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${estimatedCash}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Conversion rate: ${conversionRate}/point
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleConversionRequest}
                    disabled={submitting || !conversionAmount}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Requests are processed within 2-3 business days
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Main Content */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No transactions yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Start earning points by being active!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className={`p-2 rounded-full ${
                            transaction.points > 0
                              ? 'bg-green-100'
                              : 'bg-red-100'
                          }`}
                        >
                          {transaction.points > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {getSourceLabel(transaction.source)}
                          </p>
                          {transaction.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {transaction.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {formatTimestamp(transaction.created_at)}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`text-right ${
                            transaction.points > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          <span className="font-bold text-lg">
                            {transaction.points > 0 ? '+' : ''}
                            {transaction.points}
                          </span>
                          <p className="text-xs opacity-75">points</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <MobileBottomNav currentPage="points" />
    </div>
  );
}
