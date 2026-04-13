import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Gift,
  UserPlus,
  Shield,
  ClipboardList,
  UserCheck,
  MessageCircle,
  Video,
  Ban,
  BookOpen,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { StatCardSkeleton } from '../ui/skeletons';

interface AdminDashboardProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Stats {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  activeSubscriptions: number;
  pendingWithdrawals: number;
  totalWithdrawals: number;
  totalWithdrawnNgn: number;
  totalPosts: number;
  totalReels: number;
  bannedUsers: number;
}

interface MarketplaceStats {
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  totalGMV: number;
  pendingProducts: number;
}

export function AdminDashboard({ onNavigate, onCartClick, cartItemsCount }: AdminDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    activeSubscriptions: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0,
    totalWithdrawnNgn: 0,
    totalPosts: 0,
    totalReels: 0,
    bannedUsers: 0,
  });
  const [marketplaceEnabled, setMarketplaceEnabled] = useState(false);
  const [marketplaceToggling, setMarketplaceToggling] = useState(false);
  const [marketplaceStats, setMarketplaceStats] = useState<MarketplaceStats>({
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    totalGMV: 0,
    pendingProducts: 0,
  });

  useEffect(() => {
    fetchStats();
    fetchMarketplaceData();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Use secure admin function to get all stats in one call
      const { data: stats, error } = await supabase
        .rpc('get_admin_dashboard_stats');

      if (error) {
        // Check for permission/access errors (RPC raises exception or 403)
        const msg = error.message?.toLowerCase() || '';
        if (error.code === '42501' || msg.includes('admin') || msg.includes('permission') || msg.includes('denied')) {
          logger.error('Access denied: Admin privileges required');
          toast.error('Access denied. You need admin privileges.');
          return;
        }
        throw error;
      }

      setStats({
        totalUsers:          stats?.totalUsers          || 0,
        newUsersToday:       stats?.newUsersToday       || 0,
        newUsersThisWeek:    stats?.newUsersThisWeek    || 0,
        activeSubscriptions: stats?.activeSubscriptions || 0,
        pendingWithdrawals:  stats?.pendingWithdrawals  || 0,
        totalWithdrawals:    stats?.totalWithdrawals    || 0,
        totalWithdrawnNgn:   stats?.totalWithdrawnNgn   || 0,
        totalPosts:          stats?.totalPosts          || 0,
        totalReels:          stats?.totalReels          || 0,
        bannedUsers:         stats?.bannedUsers         || 0,
      });
    } catch (err) {
      logger.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplaceData = async () => {
    try {
      // Fetch marketplace toggle state
      const { data: setting } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'marketplace_enabled')
        .single();

      if (setting) {
        setMarketplaceEnabled(setting.setting_value?.value === true);
      }

      // Fetch marketplace stats in parallel
      const [ordersRes, pendingProductsRes] = await Promise.all([
        supabase.from('orders').select('status, total_amount'),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_approved', false).eq('is_available', true),
      ]);

      const orders = ordersRes.data || [];
      const pendingProducts = pendingProductsRes.count || 0;

      setMarketplaceStats({
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === 'pending').length,
        paidOrders: orders.filter(o => o.status === 'paid').length,
        totalGMV: orders.filter(o => o.status !== 'cancelled' && o.status !== 'refunded').reduce((sum, o) => sum + (o.total_amount || 0), 0),
        pendingProducts,
      });
    } catch (err) {
      logger.error('Error fetching marketplace data:', err);
    }
  };

  const toggleMarketplace = async () => {
    try {
      setMarketplaceToggling(true);
      const newValue = !marketplaceEnabled;

      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: { value: newValue } })
        .eq('setting_key', 'marketplace_enabled');

      if (error) throw error;

      setMarketplaceEnabled(newValue);
      toast.success(`Marketplace ${newValue ? 'enabled — users can now browse and buy' : 'hidden — users see a coming soon screen'}`);
    } catch (err: any) {
      logger.error('Error toggling marketplace:', err);
      toast.error('Failed to update marketplace status');
    } finally {
      setMarketplaceToggling(false);
    }
  };

  // Color mapping for proper Tailwind JIT compilation
  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' }
  } as const;

  const adminPages = [
    {
      title: 'User Management',
      description: 'Manage users, subscriptions, and account status',
      icon: Users,
      color: 'blue' as const,
      path: '/admin/users',
      stats: `${stats.totalUsers} users`
    },
    {
      title: 'Subscription Analytics',
      description: 'View subscription revenue, metrics, and performance',
      icon: TrendingUp,
      color: 'purple' as const,
      path: '/admin/subscription-analytics',
      stats: 'Revenue tracking'
    },
    {
      title: 'Point Settings',
      description: 'Configure point values, limits, and conversion rates',
      icon: Zap,
      color: 'purple' as const,
      path: '/admin/point-settings',
      stats: 'Manage rewards'
    },
    {
      title: 'Withdrawals',
      description: 'Review and approve user withdrawal requests',
      icon: DollarSign,
      color: 'green' as const,
      path: '/admin/withdrawals',
      stats: `${stats.pendingWithdrawals} pending`
    },
    {
      title: 'Referral Settings',
      description: 'Manage referral program rewards and bonuses',
      icon: UserPlus,
      color: 'blue' as const,
      path: '/admin/referral-settings',
      stats: 'Referral system'
    },
    {
      title: 'Signup Bonus',
      description: 'Configure welcome bonus for new users',
      icon: Gift,
      color: 'pink' as const,
      path: '/admin/signup-bonus',
      stats: 'Welcome rewards'
    },
    {
      title: 'Content Moderation',
      description: 'Review and moderate user posts, reels, and comments',
      icon: Shield,
      color: 'red' as const,
      path: '/admin/moderation',
      stats: 'Manage content'
    },
    {
      title: 'Support Inbox',
      description: 'Manage customer chat tickets, take over from AI, reply as human agent',
      icon: MessageCircle,
      color: 'purple' as const,
      path: '/admin/support',
      stats: 'Customer support'
    },
    {
      title: 'Knowledge Base',
      description: 'Add and edit AI knowledge articles — what the support bot uses to answer questions',
      icon: BookOpen,
      color: 'blue' as const,
      path: '/admin/knowledge-base',
      stats: 'AI grounding'
    },
    {
      title: 'Audit Log',
      description: 'View admin actions and accountability trail',
      icon: ClipboardList,
      color: 'orange' as const,
      path: '/admin/audit-log',
      stats: 'Admin actions'
    },
    {
      title: 'General Settings',
      description: 'Platform configuration and general settings',
      icon: Settings,
      color: 'gray' as const,
      path: '/admin/settings',
      stats: 'Platform config'
    },
    {
      title: 'Marketplace Orders',
      description: 'View and manage all customer orders — update status, view details',
      icon: ShoppingBag,
      color: 'green' as const,
      path: '/admin/marketplace-orders',
      stats: `${marketplaceStats.pendingOrders} pending orders`
    },
    {
      title: 'Marketplace Products',
      description: 'Approve, reject, and moderate product listings from sellers',
      icon: Package,
      color: 'orange' as const,
      path: '/admin/marketplace-products',
      stats: `${marketplaceStats.pendingProducts} awaiting approval`
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={onNavigate}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="admin"
        />
        <div className="max-w-6xl mx-auto px-4 py-8 pb-28 md:pb-8">
          <div className="mb-6">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
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
        currentPage="admin"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 pb-28 md:pb-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your platform settings and user requests</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+{stats.newUsersToday} today</p>
              </div>
              <Users className="w-10 h-10 text-blue-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">New This Week</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.newUsersThisWeek.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Last 7 days</p>
              </div>
              <UserPlus className="w-10 h-10 text-indigo-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Active Subscribers</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeSubscriptions.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Paid tiers</p>
              </div>
              <UserCheck className="w-10 h-10 text-purple-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Banned Users</p>
                <p className="text-2xl font-bold text-red-600">{stats.bannedUsers.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Suspended</p>
              </div>
              <Ban className="w-10 h-10 text-red-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendingWithdrawals}</p>
                <p className="text-xs text-gray-400 mt-1">Needs review</p>
              </div>
              <AlertCircle className="w-10 h-10 text-amber-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-600">
                  ₦{(stats.totalWithdrawnNgn / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-gray-400 mt-1">{stats.totalWithdrawals} transactions</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Posts</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalPosts.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">All time</p>
              </div>
              <FileText className="w-10 h-10 text-blue-100" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Reels</p>
                <p className="text-2xl font-bold text-pink-600">{stats.totalReels.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Video content</p>
              </div>
              <Video className="w-10 h-10 text-pink-100" />
            </div>
          </Card>
        </div>

        {/* Marketplace Toggle */}
        <Card className={`p-5 mb-6 border-2 ${marketplaceEnabled ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${marketplaceEnabled ? 'bg-green-100' : 'bg-gray-200'}`}>
                <ShoppingBag className={`w-5 h-5 ${marketplaceEnabled ? 'text-green-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">Marketplace</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${marketplaceEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {marketplaceEnabled ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {marketplaceEnabled
                    ? 'Users can browse, buy, and sell products'
                    : 'Users see a coming soon screen — no browsing or purchases'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex gap-4 text-sm text-gray-600">
                <span><span className="font-semibold text-gray-900">{marketplaceStats.totalOrders}</span> orders</span>
                <span><span className="font-semibold text-gray-900">₦{marketplaceStats.totalGMV.toLocaleString()}</span> GMV</span>
                <span><span className="font-semibold text-gray-900">{marketplaceStats.pendingProducts}</span> pending listings</span>
              </div>
              <button
                onClick={toggleMarketplace}
                disabled={marketplaceToggling}
                className="flex items-center gap-2 focus:outline-none"
                title={marketplaceEnabled ? 'Click to hide marketplace' : 'Click to enable marketplace'}
              >
                {marketplaceEnabled
                  ? <ToggleRight className="w-10 h-10 text-green-500" />
                  : <ToggleLeft className="w-10 h-10 text-gray-400" />}
              </button>
            </div>
          </div>
        </Card>

        {/* Admin Pages */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminPages.map((page) => (
              <Card
                key={page.path}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(page.path)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colorMap[page.color].bg}`}>
                    <page.icon className={`w-6 h-6 ${colorMap[page.color].text}`} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{page.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{page.description}</p>
                <p className="text-sm font-medium text-gray-500">{page.stats}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        {stats.pendingWithdrawals > 0 && (
          <Card className="p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  Action Required
                </h3>
                <p className="text-sm text-amber-800 mb-3">
                  You have {stats.pendingWithdrawals} pending withdrawal request{stats.pendingWithdrawals !== 1 ? 's' : ''} waiting for review.
                </p>
                <Button
                  onClick={() => navigate('/admin/withdrawals')}
                  className="bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  Review Withdrawals
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Platform Overview</h3>
                <p className="text-sm text-gray-600">
                  Monitor user activity, points distribution, and platform growth from this central dashboard.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Documentation</h3>
                <p className="text-sm text-gray-600">
                  Check the project documentation for detailed guides on managing settings and handling user requests.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />
    </div>
  );
}
