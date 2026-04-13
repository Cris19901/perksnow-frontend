import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface OrderHistoryPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: any; description: string }> = {
  pending:   { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-700',  icon: Clock,         description: 'Awaiting payment confirmation' },
  paid:      { label: 'Paid',            color: 'bg-blue-100 text-blue-700',      icon: Package,       description: 'Payment received, being prepared' },
  shipped:   { label: 'Shipped',         color: 'bg-indigo-100 text-indigo-700',  icon: Truck,         description: 'On the way to you' },
  delivered: { label: 'Delivered',       color: 'bg-green-100 text-green-700',    icon: CheckCircle,   description: 'Successfully delivered' },
  cancelled: { label: 'Cancelled',       color: 'bg-red-100 text-red-700',        icon: XCircle,       description: 'Order was cancelled' },
  refunded:  { label: 'Refunded',        color: 'bg-gray-100 text-gray-700',      icon: RefreshCw,     description: 'Refund processed' },
};

interface Order {
  id: string;
  status: OrderStatus;
  total_amount: number;
  currency: string;
  created_at: string;
  paystack_reference: string | null;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product: { title: string; images: string[] | null; image_url: string | null } | null;
    seller: { username: string } | null;
  }[];
}

export function OrderHistoryPage({ onNavigate, onCartClick, cartItemsCount }: OrderHistoryPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, total_amount, currency, created_at, paystack_reference,
          order_items(
            id, quantity, unit_price,
            product:products(title, images, image_url),
            seller:users!order_items_seller_id_fkey(username)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as any) || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProductImage = (item: Order['order_items'][0]) => {
    return item.product?.images?.[0] || item.product?.image_url || null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="orders" />

      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-6">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold">My Orders</h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No orders yet</h2>
            <p className="text-gray-500 text-sm mb-6">When you make a purchase, it will appear here.</p>
            <button
              onClick={() => navigate('/marketplace')}
              className="text-purple-600 font-medium hover:underline"
            >
              Browse Marketplace
            </button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status];
              const Icon = cfg.icon;
              const isExpanded = expandedOrder === order.id;

              return (
                <Card key={order.id} className="overflow-hidden">
                  <div
                    className="p-4 cursor-pointer flex items-center gap-4"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    {/* Status icon */}
                    <div className={`p-2.5 rounded-lg flex-shrink-0 ${cfg.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">#{order.id.slice(0, 8)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{cfg.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-NG', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                        {' · '}{order.order_items.length} item{order.order_items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold">₦{order.total_amount.toLocaleString()}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                      {order.order_items.map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {getProductImage(item) && (
                              <img src={getProductImage(item)!} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product?.title || 'Product'}</p>
                            <p className="text-xs text-gray-500">by @{item.seller?.username} · qty {item.quantity}</p>
                          </div>
                          <span className="text-sm font-medium">₦{(item.unit_price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}

                      {order.paystack_reference && (
                        <p className="text-xs text-gray-400 pt-1">
                          Ref: <span className="font-mono">{order.paystack_reference}</span>
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav currentPage="orders" onNavigate={onNavigate} />
    </div>
  );
}
