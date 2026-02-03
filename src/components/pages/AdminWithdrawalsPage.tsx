import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  DollarSign,
  Check,
  X,
  Eye,
  Clock,
  Users,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface AdminWithdrawalsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  withdrawal_method: string;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  user_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  processed_by: string | null;
  transaction_reference: string | null;
  user?: {
    username: string;
    email: string;
  };
}

interface Stats {
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  totalAmount: number;
}

export function AdminWithdrawalsPage({ onNavigate, onCartClick, cartItemsCount }: AdminWithdrawalsPageProps) {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, completed: 0, rejected: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'rejected'>('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
    }
  }, [user, filter]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);

      // Build query - using wallet_withdrawals table
      let query = supabase
        .from('wallet_withdrawals')
        .select(`
          *,
          user:users!user_id (
            username,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: withdrawalsData, error } = await query;

      if (error) throw error;

      setWithdrawals(withdrawalsData || []);

      // Calculate stats
      const allWithdrawals = withdrawalsData || [];
      setStats({
        pending: allWithdrawals.filter(w => w.status === 'pending').length,
        approved: allWithdrawals.filter(w => w.status === 'processing').length,
        completed: allWithdrawals.filter(w => w.status === 'completed').length,
        rejected: allWithdrawals.filter(w => w.status === 'rejected').length,
        totalAmount: allWithdrawals
          .filter(w => w.status === 'completed')
          .reduce((sum, w) => sum + w.amount, 0)
      });
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Failed to load withdrawal requests');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
    setAdminNotes(withdrawal.admin_notes || '');
    setShowDetailsModal(true);
  };

  const handleProcessWithdrawal = async (status: 'approved' | 'rejected' | 'completed') => {
    if (!selectedWithdrawal) return;

    if (!adminNotes.trim() && status === 'rejected') {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);

      // Call the Supabase function to process withdrawal
      const { data, error } = await supabase.rpc('process_wallet_withdrawal', {
        p_withdrawal_id: selectedWithdrawal.id,
        p_new_status: status,
        p_admin_notes: adminNotes.trim() || null,
        p_transaction_reference: null
      });

      if (error) throw error;

      toast.success(`Withdrawal ${status} successfully!`);
      setShowDetailsModal(false);
      setSelectedWithdrawal(null);
      setAdminNotes('');
      fetchWithdrawals();
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="admin"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Management</h1>
          <p className="text-gray-600">Review and process withdrawal requests</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Check className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-xl font-bold">{stats.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'processing', 'completed', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        {/* Withdrawals List */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {filter === 'all' ? 'All Requests' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
          </h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading withdrawal requests...</p>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No {filter !== 'all' ? filter : ''} withdrawal requests found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {withdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <p className="font-semibold">{withdrawal.user?.username || 'Unknown User'}</p>
                      </div>
                      <Badge className={`${getStatusBadgeColor(withdrawal.status)} border`}>
                        {withdrawal.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Amount: </span>
                        <span className="font-semibold">
                          {withdrawal.amount.toFixed(2)} {withdrawal.currency || 'NGN'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Method: </span>
                        <span className="capitalize">{withdrawal.withdrawal_method}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date: </span>
                        <span>{formatDate(withdrawal.created_at)}</span>
                      </div>
                    </div>

                    {withdrawal.account_name && (
                      <div className="text-sm text-gray-600 mt-1">
                        {withdrawal.account_name} - {withdrawal.account_number}
                        {withdrawal.bank_name && ` (${withdrawal.bank_name})`}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleViewDetails(withdrawal)}
                    variant="outline"
                    className="ml-4"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Withdrawal Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedWithdrawal && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-semibold">Status</span>
                <Badge className={`${getStatusBadgeColor(selectedWithdrawal.status)} border`}>
                  {selectedWithdrawal.status}
                </Badge>
              </div>

              {/* User Info */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">User Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-gray-600">Username:</span>
                    <p className="font-medium">{selectedWithdrawal.user?.username}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{selectedWithdrawal.account_details?.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-medium">{selectedWithdrawal.account_details?.phoneNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Country:</span>
                    <p className="font-medium">{selectedWithdrawal.account_details?.country}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Transaction Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-gray-600">Points:</span>
                    <p className="font-semibold text-purple-600">{selectedWithdrawal.amount_points.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <p className="font-semibold text-green-600">
                      {selectedWithdrawal.amount_currency.toFixed(2)} {selectedWithdrawal.account_details?.currency || 'NGN'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Method:</span>
                    <p className="font-medium capitalize">{selectedWithdrawal.withdrawal_method}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Requested:</span>
                    <p className="font-medium">{formatDate(selectedWithdrawal.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Account Details</h4>
                <div className="space-y-2 text-sm p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-gray-600">Account Name:</span>
                    <p className="font-medium">{selectedWithdrawal.account_details?.accountName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Account Number:</span>
                    <p className="font-medium">{selectedWithdrawal.account_details?.accountNumber}</p>
                  </div>
                  {selectedWithdrawal.account_details?.bankName && (
                    <div>
                      <span className="text-gray-600">Bank:</span>
                      <p className="font-medium">{selectedWithdrawal.account_details.bankName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Notes */}
              {selectedWithdrawal.user_notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">User Notes</h4>
                  <p className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {selectedWithdrawal.user_notes}
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedWithdrawal.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Admin Notes {selectedWithdrawal.status === 'pending' && '*'}</Label>
                  <Textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this withdrawal request..."
                    rows={4}
                  />
                </div>
              )}

              {selectedWithdrawal.admin_notes && selectedWithdrawal.status !== 'pending' && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700">Admin Notes</h4>
                  <p className="text-sm p-3 bg-blue-50 rounded-lg border border-blue-200">
                    {selectedWithdrawal.admin_notes}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {selectedWithdrawal.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleProcessWithdrawal('rejected')}
                    disabled={processing}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => handleProcessWithdrawal('completed')}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {processing ? 'Processing...' : 'Approve & Complete'}
                  </Button>
                </div>
              )}

              {selectedWithdrawal.status !== 'pending' && (
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
