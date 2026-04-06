import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  Heart, MessageCircle, UserPlus, Zap, DollarSign,
  CheckCheck, Bell, AlertCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'points' | 'withdrawal' | 'mention' | 'system';
  title: string;
  body: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const TYPE_ICON: Record<string, JSX.Element> = {
  follow:     <UserPlus  className="w-4 h-4 text-purple-500" />,
  like:       <Heart     className="w-4 h-4 text-red-500 fill-red-500" />,
  comment:    <MessageCircle className="w-4 h-4 text-blue-500" />,
  points:     <Zap       className="w-4 h-4 text-yellow-500" />,
  withdrawal: <DollarSign className="w-4 h-4 text-green-500" />,
  system:     <AlertCircle className="w-4 h-4 text-gray-500" />,
};

function getRelativeTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function avatarUrl(n: Notification['actor']) {
  if (n?.avatar_url) return n.avatar_url;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${n?.id ?? 'system'}`;
}

function displayName(n: Notification['actor']) {
  return n?.full_name || n?.username || 'LavLay';
}

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function NotificationsPage({ onNavigate, onCartClick, cartItemsCount }: NotificationsPageProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id, type, title, body, reference_type, reference_id, is_read, created_at,
          actor:actor_id (id, full_name, username, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications((data ?? []) as unknown as Notification[]);
    } catch (err: any) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime: subscribe to new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    try {
      await supabase.rpc('mark_notifications_read', { p_user_id: user.id });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const markOneRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unread = notifications.filter(n => !n.is_read);

  const NotifItem = ({ n }: { n: Notification }) => (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors flex gap-3 ${!n.is_read ? 'bg-purple-50/40' : ''}`}
      onClick={() => { if (!n.is_read) markOneRead(n.id); }}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={avatarUrl(n.actor)} />
          <AvatarFallback>{displayName(n.actor)[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-200">
          {TYPE_ICON[n.type] ?? TYPE_ICON.system}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{n.title}</p>
        {n.body && <p className="text-sm text-gray-600 mt-0.5 leading-snug">{n.body}</p>}
        <p className="text-xs text-gray-400 mt-1">{getRelativeTime(n.created_at)}</p>
      </div>

      {!n.is_read && (
        <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="notifications"
      />

      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 pb-28 md:pb-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
            <h1 className="text-xl font-bold">Notifications</h1>
            {unread.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-2 text-sm" onClick={markAllRead}>
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </Button>
            )}
          </div>

          <Tabs defaultValue="all">
            <div className="px-4 pt-3 border-b border-gray-100">
              <TabsList className="h-9">
                <TabsTrigger value="all" className="text-sm">
                  All {notifications.length > 0 && `(${notifications.length})`}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-sm">
                  Unread {unread.length > 0 && `(${unread.length})`}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center px-4">
                  <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-purple-300" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">No notifications yet</h3>
                  <p className="text-sm text-gray-500">When people like, comment, or follow you, it'll show up here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(n => <NotifItem key={n.id} n={n} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unread" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : unread.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center px-4">
                  <CheckCheck className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-700">You're all caught up!</p>
                  <p className="text-sm text-gray-400 mt-1">No unread notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {unread.map(n => <NotifItem key={n.id} n={n} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MobileBottomNav currentPage="notifications" onNavigate={onNavigate} />
    </div>
  );
}
