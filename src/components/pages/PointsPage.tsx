import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { MobileBottomNav } from '../MobileBottomNav';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Coins,
  TrendingUp,
  Gift,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
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
  amount: number;
  transaction_type: 'earn' | 'spend' | 'redeem';
  activity: string;
  created_at: string;
}

export function PointsPage({ onNavigate, onCartClick, cartItemsCount }: PointsPageProps) {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPointsData();
    }
  }, [user]);

  const fetchPointsData = async () => {
    try {
      setLoading(true);

      // Fetch user points balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      setPoints(userData?.points_balance || 0);

      // Fetch points transactions history
      const { data: transactionsData, error: transError } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transError) throw transError;
      setTransactions(transactionsData || []);

    } catch (error: any) {
      console.error('Error fetching points data:', error);
      toast.error('Failed to load points data');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'spend':
      case 'redeem':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      default:
        return <Coins className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="points"
        />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
        <MobileBottomNav currentPage="points" onNavigate={onNavigate} />
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

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 pb-20 md:pb-6">
        {/* Points Balance Card */}
        <Card className="bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 text-white p-6 sm:p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-lg font-semibold">Your Points</h2>
            </div>
            <Coins className="w-8 h-8 opacity-80" />
          </div>

          <div className="mb-6">
            <p className="text-4xl sm:text-5xl font-bold mb-2">{points.toLocaleString()}</p>
            <p className="text-white/80 text-sm">Total Points Balance</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4" />
                <p className="text-xs">Earned This Month</p>
              </div>
              <p className="text-xl font-bold">
                {transactions
                  .filter(t => t.transaction_type === 'earn')
                  .slice(0, 10)
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4" />
                <p className="text-xs">Available Rewards</p>
              </div>
              <p className="text-xl font-bold">5</p>
            </div>
          </div>
        </Card>

        {/* How to Earn Points */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Coins className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Post Content</p>
                <p className="text-xs text-gray-600">+10 points per post</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-pink-50 rounded-lg">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Coins className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Upload Reel</p>
                <p className="text-xs text-gray-600">+20 points per reel</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Coins className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Daily Login</p>
                <p className="text-xs text-gray-600">+5 points daily</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Transactions History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Recent Transactions
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Coins className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No transactions yet</p>
              <p className="text-sm">Start earning points by posting content!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.transaction_type === 'earn'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}>
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.activity}</p>
                      <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-bold ${
                      transaction.transaction_type === 'earn'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'earn' ? '+' : '-'}
                      {transaction.amount}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.transaction_type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <MobileBottomNav currentPage="points" onNavigate={onNavigate} />
    </div>
  );
}
