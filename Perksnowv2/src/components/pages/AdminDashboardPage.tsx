import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Users,
  FileText,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Activity,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  reportedContent: number;
  activeStories: number;
  pendingProducts: number;
}

interface RecentActivity {
  id: string;
  type: 'user' | 'post' | 'product' | 'order';
  action: string;
  timestamp: string;
  details: string;
}

interface AdminDashboardPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function AdminDashboardPage({ onCartClick, cartItemsCount }: AdminDashboardPageProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    reportedContent: 0,
    activeStories: 0,
    pendingProducts: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    fetchDashboardData();
  }, [user, authLoading, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        usersCount,
        postsCount,
        productsCount,
        ordersData,
        storiesCount,
        reportsCount,
        recentUsers,
        recentPosts,
        recentProducts,
      ] = await Promise.all([
        // Total users
        supabase.from('users').select('id', { count: 'exact', head: true }),

        // Total posts
        supabase.from('posts').select('id', { count: 'exact', head: true }),

        // Total products
        supabase.from('products').select('id', { count: 'exact', head: true }),

        // Total orders and revenue
        supabase.from('orders').select('total_amount'),

        // Active stories
        supabase
          .from('stories')
          .select('id', { count: 'exact', head: true })
          .gt('expires_at', new Date().toISOString()),

        // Reported content (placeholder - we'll need a reports table)
        Promise.resolve({ count: 0 }),

        // Recent users (last 5)
        supabase
          .from('users')
          .select('id, username, created_at')
          .order('created_at', { ascending: false })
          .limit(5),

        // Recent posts (last 5)
        supabase
          .from('posts')
          .select('id, content, created_at, users(username)')
          .order('created_at', { ascending: false })
          .limit(5),

        // Recent products (last 5)
        supabase
          .from('products')
          .select('id, name, created_at, users(username)')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // Calculate revenue
      const revenue = ordersData.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setStats({
        totalUsers: usersCount.count || 0,
        totalPosts: postsCount.count || 0,
        totalProducts: productsCount.count || 0,
        totalOrders: ordersData.data?.length || 0,
        totalRevenue: revenue,
        reportedContent: reportsCount.count || 0,
        activeStories: storiesCount.count || 0,
        pendingProducts: 0, // TODO: Add when we have product approval system
      });

      // Build recent activity
      const activities: RecentActivity[] = [];

      recentUsers.data?.forEach((u) => {
        activities.push({
          id: u.id,
          type: 'user',
          action: 'New user registered',
          timestamp: u.created_at,
          details: `@${u.username || 'unknown'}`,
        });
      });

      recentPosts.data?.forEach((p) => {
        activities.push({
          id: p.id,
          type: 'post',
          action: 'New post created',
          timestamp: p.created_at,
          details: `by @${p.users?.username || 'unknown'}`,
        });
      });

      recentProducts.data?.forEach((p) => {
        activities.push({
          id: p.id,
          type: 'product',
          action: 'New product listed',
          timestamp: p.created_at,
          details: `${p.name} by @${p.users?.username || 'unknown'}`,
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 10));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <Users className="w-4 h-4" />;
      case 'post':
        return <FileText className="w-4 h-4" />;
      case 'product':
        return <ShoppingBag className="w-4 h-4" />;
      case 'order':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Overview of your platform's key metrics and recent activity
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
          >
            <Users className="w-5 h-5 text-purple-600 mb-2" />
            <p className="font-semibold text-sm">Users</p>
            <p className="text-xs text-gray-600">Manage users</p>
          </button>

          <button
            onClick={() => navigate('/admin/moderation')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all text-left"
          >
            <AlertCircle className="w-5 h-5 text-orange-600 mb-2" />
            <p className="font-semibold text-sm">Moderation</p>
            <p className="text-xs text-gray-600">Review reports</p>
          </button>

          <button
            onClick={() => navigate('/admin/products')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
          >
            <ShoppingBag className="w-5 h-5 text-blue-600 mb-2" />
            <p className="font-semibold text-sm">Products</p>
            <p className="text-xs text-gray-600">Manage catalog</p>
          </button>

          <button
            onClick={() => navigate('/admin/rewards')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
          >
            <DollarSign className="w-5 h-5 text-green-600 mb-2" />
            <p className="font-semibold text-sm">Rewards</p>
            <p className="text-xs text-gray-600">Reward pools</p>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Users */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Users
                    </CardTitle>
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Registered accounts</p>
                </CardContent>
              </Card>

              {/* Total Posts */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Posts
                    </CardTitle>
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalPosts.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Published content</p>
                </CardContent>
              </Card>

              {/* Total Products */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Products
                    </CardTitle>
                    <ShoppingBag className="w-5 h-5 text-green-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalProducts.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Listed items</p>
                </CardContent>
              </Card>

              {/* Total Revenue */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Revenue
                    </CardTitle>
                    <DollarSign className="w-5 h-5 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-600 mt-1">{stats.totalOrders} orders</p>
                </CardContent>
              </Card>

              {/* Active Stories */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Active Stories
                    </CardTitle>
                    <Activity className="w-5 h-5 text-pink-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.activeStories.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Non-expired stories</p>
                </CardContent>
              </Card>

              {/* Reported Content */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Reported Content
                    </CardTitle>
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.reportedContent.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Awaiting review</p>
                </CardContent>
              </Card>

              {/* Pending Products */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Pending Products
                    </CardTitle>
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.pendingProducts.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Awaiting approval</p>
                </CardContent>
              </Card>

              {/* Growth Rate (Placeholder) */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Growth Rate
                    </CardTitle>
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">+12.5%</p>
                  <p className="text-xs text-gray-600 mt-1">vs last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="p-2 bg-white rounded-full">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-600 truncate">{activity.details}</p>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
