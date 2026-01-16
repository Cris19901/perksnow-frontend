import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  withdrawal_method: string;
  bank_name: string | null;
  account_number: string | null;
  created_at: string;
  admin_notes: string | null;
}

const MINIMUM_WITHDRAWAL = 1000; // ₦1,000 minimum

export function WithdrawPage() {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWalletBalance();
      fetchWithdrawals();
    }
  }, [user]);

  const fetchWalletBalance = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setWalletBalance(data?.wallet_balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      toast.error('Failed to load wallet balance');
    }
  };

  const fetchWithdrawals = async () => {
    if (!user?.id) return;

    try {
      setLoadingWithdrawals(true);
      const { data, error } = await supabase
        .from('wallet_withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('Please log in to withdraw');
      return;
    }

    const withdrawalAmount = parseFloat(amount);

    // Validations
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawalAmount < MINIMUM_WITHDRAWAL) {
      toast.error(`Minimum withdrawal is ₦${MINIMUM_WITHDRAWAL.toLocaleString()}`);
      return;
    }

    if (withdrawalAmount > walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    if (!bankName || !accountNumber || !accountName) {
      toast.error('Please fill in all bank details');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('wallet_withdrawals')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          currency: 'NGN',
          withdrawal_method: withdrawalMethod,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          user_notes: userNotes,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Withdrawal request submitted successfully!');

      // Reset form
      setAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      setUserNotes('');

      // Refresh data
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-500">
            <Clock className="w-3 h-3 mr-1" />
            Processing
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canWithdraw = walletBalance >= MINIMUM_WITHDRAWAL;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
          <p className="text-gray-600 mt-2">
            Withdraw your referral earnings to your bank account
          </p>
        </div>

        {/* Wallet Balance Card */}
        <Card className="mb-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              {formatCurrency(walletBalance)}
            </div>
            <p className="text-purple-100 text-sm">
              From referral commissions
            </p>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert className="mb-8">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Withdrawal Requirements:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Minimum withdrawal: {formatCurrency(MINIMUM_WITHDRAWAL)}</li>
              <li>Processing time: 1-3 business days</li>
              <li>Bank transfers only (Nigeria)</li>
              <li>Verify your bank details carefully</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Withdrawal Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>
              Enter your bank details to withdraw funds
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canWithdraw ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You need at least {formatCurrency(MINIMUM_WITHDRAWAL)} to withdraw.
                  Current balance: {formatCurrency(walletBalance)}
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <Label htmlFor="amount">Amount (NGN)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={MINIMUM_WITHDRAWAL}
                    max={walletBalance}
                    step="100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min: {formatCurrency(MINIMUM_WITHDRAWAL)} • Max: {formatCurrency(walletBalance)}
                  </p>
                </div>

                {/* Withdrawal Method */}
                <div>
                  <Label htmlFor="method">Withdrawal Method</Label>
                  <Select value={withdrawalMethod} onValueChange={setWithdrawalMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="opay">OPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bank Name */}
                <div>
                  <Label htmlFor="bank">Bank Name</Label>
                  <Input
                    id="bank"
                    placeholder="e.g., Access Bank, GTBank, UBA"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                  />
                </div>

                {/* Account Number */}
                <div>
                  <Label htmlFor="account">Account Number</Label>
                  <Input
                    id="account"
                    placeholder="10-digit account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    maxLength={10}
                    required
                  />
                </div>

                {/* Account Name */}
                <div>
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Account holder name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                  />
                </div>

                {/* Optional Notes */}
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !canWithdraw}
                >
                  {loading ? (
                    'Submitting...'
                  ) : (
                    <>
                      Request Withdrawal
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
            <CardDescription>
              Track your withdrawal requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWithdrawals ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No withdrawal requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1 mb-2 md:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">
                          {formatCurrency(withdrawal.amount)}
                        </span>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {withdrawal.bank_name} • {withdrawal.account_number}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(withdrawal.created_at)}
                      </p>
                      {withdrawal.admin_notes && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          Note: {withdrawal.admin_notes}
                        </p>
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
