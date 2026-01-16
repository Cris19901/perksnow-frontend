import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  Search,
  Users,
  Crown,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface AdminUserManagementPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface User {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  points_balance: number;
  is_banned: boolean;
  created_at: string;
  followers_count: number;
  following_count: number;
}

export function AdminUserManagementPage({ onNavigate, onCartClick, cartItemsCount }: AdminUserManagementPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'free' | 'pro'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const usersPerPage = 20;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, filterTier]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Build query
      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Apply tier filter
      if (filterTier !== 'all') {
        query = query.eq('subscription_tier', filterTier);
      }

      // Apply pagination
      const from = (currentPage - 1) * usersPerPage;
      const to = from + usersPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data || []);
      setTotalUsers(count || 0);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, shouldBan: boolean) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('users')
        .update({ is_banned: shouldBan })
        .eq('id', userId);

      if (error) throw error;

      toast.success(shouldBan ? 'User banned successfully' : 'User unbanned successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Error banning user:', err);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
      setShowBanDialog(false);
      setSelectedUser(null);
    }
  };

  const handleUpgradeUser = async (userId: string) => {
    try {
      setActionLoading(userId);

      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: 'pro',
          subscription_status: 'active',
          subscription_expires_at: expiresAt.toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User upgraded to Pro successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Error upgrading user:', err);
      toast.error('Failed to upgrade user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDowngradeUser = async (userId: string) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: 'free',
          subscription_status: 'inactive',
          subscription_expires_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User downgraded to Free successfully');
      fetchUsers();
    } catch (err: any) {
      console.error('Error downgrading user:', err);
      toast.error('Failed to downgrade user');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  if (loading && users.length === 0) {
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

      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
          <p className="text-gray-600">Manage users, subscriptions, and account status</p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search by username, name, or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterTier === 'all' ? 'default' : 'outline'}
                onClick={() => {
                  setFilterTier('all');
                  setCurrentPage(1);
                }}
                size="sm"
              >
                All Users
              </Button>
              <Button
                variant={filterTier === 'free' ? 'default' : 'outline'}
                onClick={() => {
                  setFilterTier('free');
                  setCurrentPage(1);
                }}
                size="sm"
              >
                Free
              </Button>
              <Button
                variant={filterTier === 'pro' ? 'default' : 'outline'}
                onClick={() => {
                  setFilterTier('pro');
                  setCurrentPage(1);
                }}
                size="sm"
              >
                <Crown className="w-4 h-4 mr-1" />
                Pro
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
              <Users className="w-10 h-10 text-blue-200" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pro Users</p>
                <p className="text-2xl font-bold text-purple-600">
                  {users.filter(u => u.subscription_tier === 'pro' && u.subscription_status === 'active').length}
                </p>
              </div>
              <Crown className="w-10 h-10 text-purple-200" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Banned Users</p>
                <p className="text-2xl font-bold text-red-600">
                  {users.filter(u => u.is_banned).length}
                </p>
              </div>
              <Ban className="w-10 h-10 text-red-200" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">This Page</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-200" />
            </div>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subscription</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stats</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Joined</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {userItem.full_name?.[0] || userItem.username[0]}
                        </div>
                        <div>
                          <p className="font-medium">{userItem.full_name || userItem.username}</p>
                          <p className="text-sm text-gray-500">@{userItem.username}</p>
                          <p className="text-xs text-gray-400">{userItem.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {userItem.subscription_tier === 'pro' ? (
                          <>
                            <Badge className="w-fit bg-gradient-to-r from-purple-600 to-blue-600">
                              <Crown className="w-3 h-3 mr-1" />
                              Pro
                            </Badge>
                            {userItem.subscription_expires_at && (
                              <span className="text-xs text-gray-500">
                                Expires {formatDate(userItem.subscription_expires_at)}
                              </span>
                            )}
                          </>
                        ) : (
                          <Badge variant="secondary">Free</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 text-sm">
                        <span>{userItem.points_balance} points</span>
                        <span className="text-gray-500">{userItem.followers_count} followers</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {userItem.is_banned ? (
                        <Badge variant="destructive">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDate(userItem.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {userItem.subscription_tier === 'free' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpgradeUser(userItem.id)}
                            disabled={actionLoading === userItem.id}
                          >
                            {actionLoading === userItem.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Crown className="w-4 h-4 mr-1" />
                                Upgrade
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDowngradeUser(userItem.id)}
                            disabled={actionLoading === userItem.id}
                          >
                            {actionLoading === userItem.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Downgrade'
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={userItem.is_banned ? 'outline' : 'destructive'}
                          onClick={() => {
                            setSelectedUser(userItem);
                            setShowBanDialog(true);
                          }}
                          disabled={actionLoading === userItem.id}
                        >
                          {actionLoading === userItem.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : userItem.is_banned ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Unban
                            </>
                          ) : (
                            <>
                              <Ban className="w-4 h-4 mr-1" />
                              Ban
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * usersPerPage + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav currentPage="admin" onNavigate={onNavigate} />

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              {selectedUser?.is_banned ? 'Unban User?' : 'Ban User?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_banned ? (
                <>
                  Are you sure you want to unban <strong>@{selectedUser?.username}</strong>?
                  They will regain access to their account and all features.
                </>
              ) : (
                <>
                  Are you sure you want to ban <strong>@{selectedUser?.username}</strong>?
                  They will no longer be able to access their account or use the platform.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && handleBanUser(selectedUser.id, !selectedUser.is_banned)}
              className={selectedUser?.is_banned ? '' : 'bg-red-600 hover:bg-red-700'}
            >
              {selectedUser?.is_banned ? 'Unban User' : 'Ban User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
