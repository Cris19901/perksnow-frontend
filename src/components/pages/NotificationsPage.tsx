import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Heart, MessageCircle, ShoppingCart, UserPlus, Package, Star, CheckCheck, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'order' | 'review' | 'delivery';
  user: {
    name: string;
    avatar: string | null;
  };
  content: string;
  image?: string;
  timestamp: string;
  read: boolean;
  created_at: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
    case 'comment':
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'order':
      return <ShoppingCart className="w-4 h-4 text-green-500" />;
    case 'follow':
      return <UserPlus className="w-4 h-4 text-purple-500" />;
    case 'review':
      return <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
    case 'delivery':
      return <Package className="w-4 h-4 text-orange-500" />;
    default:
      return null;
  }
};

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function NotificationsPage({ onNavigate, onCartClick, cartItemsCount }: NotificationsPageProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // For now, show empty state
      // In a real implementation, you would fetch from a notifications table
      setNotifications([]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      // In a real implementation, you would update notifications table
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking as read:', err);
      toast.error('Failed to mark as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const allNotifications = notifications;
  const unreadNotifications = notifications.filter((n) => !n.read);

  const getAvatarUrl = (avatarUrl: string | null, name: string) => {
    return avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="notifications"
      />

      <div className="max-w-[800px] mx-auto px-4 py-4 sm:py-6">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="gap-2" onClick={markAllAsRead}>
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </Button>
              )}
            </div>

            <Tabs defaultValue="all">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all" className="flex-1 sm:flex-initial">
                  All {allNotifications.length > 0 && `(${allNotifications.length})`}
                </TabsTrigger>
                <TabsTrigger value="unread" className="flex-1 sm:flex-initial">
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : allNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">No notifications yet</h3>
                    <p className="text-sm text-gray-500">
                      When people interact with you, you'll see it here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {allNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-purple-50/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar>
                              <AvatarImage src={getAvatarUrl(notification.user.avatar, notification.user.name)} />
                              <AvatarFallback>{notification.user.name[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{notification.user.name}</span>{' '}
                              <span className="text-gray-600">{notification.content}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getRelativeTime(notification.created_at)}
                            </p>
                          </div>

                          {notification.image && (
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={notification.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {!notification.read && (
                            <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unread" className="mt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                ) : unreadNotifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCheck className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p className="font-medium text-gray-900">You're all caught up!</p>
                    <p className="text-sm text-gray-500 mt-1">No unread notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {unreadNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors bg-purple-50/50"
                      >
                        <div className="flex gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar>
                              <AvatarImage src={getAvatarUrl(notification.user.avatar, notification.user.name)} />
                              <AvatarFallback>{notification.user.name[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border border-gray-200">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{notification.user.name}</span>{' '}
                              <span className="text-gray-600">{notification.content}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {getRelativeTime(notification.created_at)}
                            </p>
                          </div>

                          {notification.image && (
                            <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                              <img
                                src={notification.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
