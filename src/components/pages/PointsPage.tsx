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
  Sparkles,
  DollarSign,
  FileText,
  Crown,
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { WithdrawalModal } from '../WithdrawalModal';

interface PointsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Transaction {
  id: string;
  points: number;
  transaction_type: 'earn' | 'spend' | 'redeem';
  activity: string;
  created_at: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  withdrawal_method: string;
  account_name: string | null;
  account_number: string | null;
  bank_name: string | null;
  user_notes: string | null;
  admin_notes: string | null;
  created_at: string;
}

export function PointsPage({ onNavigate, onCartClick, cartItemsCount }: PointsPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [maturedPoints, setMaturedPoints] = useState(0);
  const [frozenPoints, setFrozenPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [isFreeTier, setIsFreeTier] = useState(true);
  const [hasEverSubscribed, setHasEverSubscribed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPointsData();
    }
  }, [user]);

  const fetchPointsData = async () => {
    try {
      setLoading(true);

      // Fetch user points balance and subscription info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('points_balance, subscription_tier, subscription_status, subscription_expires_at')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      const totalPoints = userData?.points_balance || 0;
      setPoints(totalPoints);
      // Consider anyone who has (or had) a non-free tier as having subscribed
      setHasEverSubscribed(!!userData?.subscription_tier && userData.subscription_tier !== 'free');

      // Check if user is on a paid, active tier
      const isPaid = userData?.subscription_tier
        && userData.subscription_tier !== 'free'
        && userData.subscription_status === 'active'
        && (!userData.subscription_expires_at || new Date(userData.subscription_expires_at) > new Date());
      setIsFreeTier(!isPaid);

      // Fetch frozen points (earned in last 7 days, not yet matured)
      const { data: frozenData } = await supabase.rpc('get_frozen_points', { p_user_id: user?.id });
      const frozen = frozenData || 0;
      setFrozenPoints(frozen);
      setMaturedPoints(Math.max(0, totalPoints - frozen));

      // Fetch points transactions history
      const { data: transactionsData, error: transError } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transError) throw transError;
      setTransactions(transactionsData || []);

      // Fetch withdrawal requests
      const { data: withdrawalsData, error: withdrawError } = await supabase
        .from('wallet_withdrawals')
        .select('id, amount, currency, status, withdrawal_method, account_name, account_number, bank_name, user_notes, admin_notes, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (withdrawError) {
        console.log('Note: Error fetching withdrawals:', withdrawError);
      } else {
        setWithdrawals(withdrawalsData || []);
      }

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
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

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 pb-28 md:pb-6">
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
            <Button
              onClick={() => setShowWithdrawalModal(true)}
              className="mt-4 bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-sm"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <p className="text-xs">Withdrawable</p>
              </div>
              <p className="text-lg font-bold">{maturedPoints.toLocaleString()}</p>
              <p className="text-[10px] text-white/60">Matured points</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <p className="text-xs">Maturing</p>
              </div>
              <p className="text-lg font-bold">{frozenPoints.toLocaleString()}</p>
              <p className="text-[10px] text-white/60">Ready in 7 days</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center gap-1 mb-1">
                <Gift className="w-3.5 h-3.5" />
                <p className="text-xs">Earned Recently</p>
              </div>
              <p className="text-lg font-bold">
                {transactions
                  .filter(t => t.transaction_type === 'earn')
                  .slice(0, 10)
                  .reduce((sum, t) => sum + (t.points || 0), 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {/* Earning Locked Banner — never subscribed */}
        {!hasEverSubscribed && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 sm:p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <Lock className="w-5 h-5 text-red-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Point Earning is Locked
                </h3>
                <p className="text-sm text-red-800 mb-3">
                  Subscribe to any plan to unlock point earning. Once unlocked, you keep earning even after your subscription expires. Start with the Daily plan for just &#8358;200.
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate('/subscription')}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Unlock Earning — &#8358;200
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Withdrawal Locked Banner — subscribed before but currently free tier */}
        {hasEverSubscribed && isFreeTier && points > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 sm:p-5 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  You have {maturedPoints.toLocaleString()} matured points ready to withdraw
                </h3>
                <p className="text-sm text-amber-800 mb-3">
                  Subscribe to any paid plan to withdraw your earnings. You're still earning points — they just need an active plan to cash out.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate('/subscription')}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Crown className="w-4 h-4 mr-1" />
                    Unlock Withdrawals
                  </Button>
                  <p className="text-xs text-amber-700 self-center">Starting from &#8358;200/day</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* How to Earn Points */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            How to Earn Points
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Post Content</p>
                <p className="text-xs text-gray-600">+200 points per post</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-pink-50 rounded-lg">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Upload Reel</p>
                <p className="text-xs text-gray-600">+250 points per reel</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Comments Received</p>
                <p className="text-xs text-gray-600">+30 points per comment</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Likes Received</p>
                <p className="text-xs text-gray-600">+0.5 points per like</p>
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
                      {transaction.points}
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

        {/* Withdrawal Requests History */}
        {withdrawals.length > 0 && (
          <Card className="p-6 mt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Withdrawal Requests
            </h3>

            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">
                        {(withdrawal.amount * 10).toLocaleString()} points
                      </p>
                      <span className="text-gray-400">=</span>
                      <p className="text-sm text-gray-600 font-semibold">
                        {withdrawal.amount.toFixed(2)} {withdrawal.currency || 'NGN'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span className="capitalize">{withdrawal.withdrawal_method?.replace('_', ' ') || 'N/A'}</span>
                      <span>•</span>
                      <span>{formatDate(withdrawal.created_at)}</span>
                    </div>
                    {withdrawal.account_name && (
                      <p className="text-xs text-gray-600">
                        {withdrawal.account_name}
                        {withdrawal.bank_name && ` • ${withdrawal.bank_name}`}
                      </p>
                    )}
                    {withdrawal.admin_notes && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border border-gray-200">
                        <span className="font-semibold">Admin Note:</span> {withdrawal.admin_notes}
                      </p>
                    )}
                  </div>

                  <div className="ml-4">
                    <Badge className={`${getStatusBadgeColor(withdrawal.status)} border`}>
                      {withdrawal.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
        currentBalance={points}
        maturedBalance={maturedPoints}
        onSuccess={fetchPointsData}
      />

      <MobileBottomNav currentPage="points" onNavigate={onNavigate} />
    </div>
  );
}
