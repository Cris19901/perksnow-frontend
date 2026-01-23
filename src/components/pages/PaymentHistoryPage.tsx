import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Header } from '../Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, Receipt, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface PaymentTransaction {
  id: string;
  reference: string;
  amount: number;
  status: string;
  paid_at: string;
  created_at: string;
  subscriptions: {
    plan_name: string;
    billing_cycle: string;
  };
}

export default function PaymentHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartItemsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          reference,
          amount,
          status,
          paid_at,
          created_at,
          subscriptions (
            plan_name,
            billing_cycle
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  const downloadReceipt = (transaction: PaymentTransaction) => {
    // Create a simple text receipt
    const receipt = `
LAVLAY PAYMENT RECEIPT
======================

Transaction ID: ${transaction.reference}
Date: ${new Date(transaction.paid_at || transaction.created_at).toLocaleString()}
Plan: ${transaction.subscriptions?.plan_name || 'N/A'}
Billing Cycle: ${transaction.subscriptions?.billing_cycle || 'N/A'}
Amount: ₦${transaction.amount / 100}
Status: ${transaction.status.toUpperCase()}

Thank you for your payment!
www.lavlay.com
    `.trim();

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.reference}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <>
      <Header onCartClick={() => {}} cartItemsCount={cartItemsCount} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/subscription')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Subscription
            </Button>
            <h1 className="text-3xl font-bold">Payment History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View all your subscription payments and download receipts
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && transactions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No payments yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your payment history will appear here once you make a subscription payment.
                </p>
                <Button onClick={() => navigate('/subscription')}>
                  View Subscription Plans
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Transaction List */}
          {!loading && transactions.length > 0 && (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(transaction.status)}
                        <div>
                          <CardTitle className="text-lg">
                            {transaction.subscriptions?.plan_name || 'Subscription'} Plan
                          </CardTitle>
                          <CardDescription>
                            {new Date(transaction.paid_at || transaction.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                        <p className="text-lg font-semibold">₦{transaction.amount / 100}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Reference</p>
                        <p className="text-sm font-mono">{transaction.reference.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Billing Cycle</p>
                        <p className="text-sm capitalize">
                          {transaction.subscriptions?.billing_cycle || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-end justify-end">
                        {transaction.status === 'success' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReceipt(transaction)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
