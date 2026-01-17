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
  Star,
  Shield
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminDashboardProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface Stats {
  totalUsers: number;
  totalPoints: number;
  pendingWithdrawals: number;
  totalWithdrawals: number;
}

export function AdminDashboard({ onNavigate, onCartClick, cartItemsCount }: AdminDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPoints: 0,
    pendingWithdrawals: 0,
    totalWithdrawals: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch total points in circulation
      const { data: pointsData } = await supabase
        .from('users')
        .select('points_balance');

      const totalPoints = pointsData?.reduce((sum, u) => sum + (u.points_balance || 0), 0) || 0;

      // Fetch pending withdrawals
      const { count: pendingCount } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch total withdrawals
      const { count: totalCount } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalPoints,
        pendingWithdrawals: pendingCount || 0,
        totalWithdrawals: totalCount || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const adminPages = [
    {
      title: 'User Management',
      description: 'Manage users, subscriptions, and account status',
      icon: Users,
      color: 'blue',
      path: '/admin/users',
      stats: `${stats.totalUsers} users`
    },
    {
      title: 'Point Settings',
      description: 'Configure point values, limits, and conversion rates',
      icon: Zap,
      color: 'purple',
      path: '/admin/point-settings',
      stats: 'Manage rewards'
    },
    {
      title: 'Withdrawals',
      description: 'Review and approve user withdrawal requests',
      icon: DollarSign,
      color: 'green',
      path: '/admin/withdrawals',
      stats: `${stats.pendingWithdrawals} pending`
    },
    {
      title: 'Referral Settings',
      description: 'Manage referral program rewards and bonuses',
      icon: UserPlus,
      color: 'blue',
      path: '/admin/referral-settings',
      stats: 'Referral system'
    },
    {
      title: 'Signup Bonus',
      description: 'Configure welcome bonus for new users',
      icon: Gift,
      color: 'pink',
      path: '/admin/signup-bonus',
      stats: 'Welcome rewards'
    },
    {
      title: 'Content Moderation',
      description: 'Review and moderate user posts, reels, and comments',
      icon: Shield,
      color: 'red',
      path: '/admin/moderation',
      stats: 'Manage content'
    },
    {
      title: 'General Settings',
      description: 'Platform configuration and general settings',
      icon: Settings,
      color: 'gray',
      path: '/admin/settings',
      stats: 'Platform config'
    }
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
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Points</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.totalPoints.toLocaleString()}
                </p>
              </div>
              <Zap className="w-12 h-12 text-purple-200" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pendingWithdrawals}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-amber-200" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Withdrawals</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalWithdrawals}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-200" />
            </div>
          </Card>
        </div>

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
                  <div className={`p-3 rounded-lg bg-${page.color}-100`}>
                    <page.icon className={`w-6 h-6 text-${page.color}-600`} />
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
