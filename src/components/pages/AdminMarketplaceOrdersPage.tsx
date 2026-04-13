import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  ShoppingBag,
  ArrowLeft,
  Search,
  Eye,
  ChevronDown,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminMarketplaceOrdersPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface Order {
  id: string;
  buyer_id: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  paystack_reference: string | null;
  created_at: string;
  updated_at: string;
  buyer: { username: string; full_name: string | null; email: string } | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product: { title: string; images: any } | null;
    seller: { username: string } | null;
  }[];
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700',  icon: Clock },
  paid:      { label: 'Paid',      color: 'bg-blue-100 text-blue-700',      icon: Package },
  shipped:   { label: 'Shipped',   color: 'bg-indigo-100 text-indigo-700',  icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700',    icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700',        icon: XCircle },
  refunded:  { label: 'Refunded',  color: 'bg-gray-100 text-gray-700',      icon: RefreshCw },
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['paid', 'cancelled'],
  paid:      ['shipped', 'cancelled'],
  shipped:   ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded:  [],
};

export function AdminMarketplaceOrdersPage({ onNavigate, onCartClick, cartItemsCount }: AdminMarketplaceOrdersPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:users!orders_buyer_id_fkey(username, full_name, email),
          order_items(
            id, quantity, unit_price,
            product:products(title, images),
            seller:users!order_items_seller_id_fkey(username)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      setUpdatingStatus(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order marked as ${STATUS_CONFIG[newStatus].label}`);
    } catch (err: any) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const filtered = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch = !search
      || order.id.includes(searchLower)
      || order.buyer?.username?.toLowerCase().includes(searchLower)
      || order.buyer?.email?.toLowerCase().includes(searchLower)
      || order.paystack_reference?.toLowerCase().includes(searchLower)
      || order.shipping_address?.city?.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const totalGMV = orders
    .filter(o => !['cancelled', 'refunded'].includes(o.status))
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="admin" />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-6">
        {/* Back */}
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-green-600" />
              Marketplace Orders
            </h1>
            <p className="text-gray-500 text-sm mt-1">{orders.length} total orders · ₦{totalGMV.toLocaleString()} GMV</p>
          </div>
          <Button onClick={fetchOrders} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(['pending', 'paid', 'shipped', 'delivered'] as OrderStatus[]).map(s => {
            const count = orders.filter(o => o.status === s).length;
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <Card
                key={s}
                className={`p-4 cursor-pointer transition-all ${statusFilter === s ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{cfg.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <span className={`p-2 rounded-lg ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by buyer, email, reference, city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
              <option key={s} value={s}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Orders list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No orders found</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status];
              const Icon = cfg.icon;
              const isExpanded = expandedOrder === order.id;
              const transitions = STATUS_TRANSITIONS[order.status];

              return (
                <Card key={order.id} className="overflow-hidden">
                  {/* Order header row */}
                  <div
                    className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="font-medium text-sm mt-0.5 truncate">
                        {order.buyer?.username || order.buyer?.email || 'Unknown buyer'}
                        {order.buyer?.full_name ? ` · ${order.buyer.full_name}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">₦{order.total_amount.toLocaleString()}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                      {/* Items */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                        <div className="space-y-2">
                          {order.order_items.map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                {item.product?.images?.[0] && (
                                  <img src={item.product.images[0]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.product?.title || 'Product'}</p>
                                <p className="text-xs text-gray-500">by @{item.seller?.username} · qty {item.quantity}</p>
                              </div>
                              <span className="text-sm font-medium">₦{(item.unit_price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping address */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Ship to</p>
                        <p className="text-sm text-gray-700">
                          {order.shipping_address.first_name} {order.shipping_address.last_name}<br />
                          {order.shipping_address.street}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}<br />
                          {order.shipping_address.phone} · {order.shipping_address.email}
                        </p>
                      </div>

                      {/* Reference */}
                      {order.paystack_reference && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment Reference</p>
                          <p className="font-mono text-xs text-gray-600">{order.paystack_reference}</p>
                        </div>
                      )}

                      {/* Status actions */}
                      {transitions.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Update Status</p>
                          <div className="flex flex-wrap gap-2">
                            {transitions.map(next => {
                              const nextCfg = STATUS_CONFIG[next];
                              const NextIcon = nextCfg.icon;
                              return (
                                <Button
                                  key={next}
                                  size="sm"
                                  variant="outline"
                                  disabled={updatingStatus === order.id}
                                  onClick={() => updateStatus(order.id, next)}
                                  className="text-xs"
                                >
                                  <NextIcon className="w-3.5 h-3.5 mr-1" />
                                  Mark as {nextCfg.label}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
    </div>
  );
}
