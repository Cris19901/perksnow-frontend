import { Header } from '../Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { MobileBottomNav } from '../MobileBottomNav';
import {
  Heart, MessageCircle, UserPlus, Zap, DollarSign,
  CheckCheck, Bell, AlertCircle, ChevronRight,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifType = 'follow' | 'like' | 'comment' | 'points' | 'withdrawal' | 'mention' | 'system';

interface Notification {
  id: string;
  type: NotifType;
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

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<NotifType, { icon: JSX.Element; color: string; bg: string }> = {
  follow:     { icon: <UserPlus className="w-3.5 h-3.5" />,      color: 'text-purple-600', bg: 'bg-purple-500' },
  like:       { icon: <Heart className="w-3.5 h-3.5 fill-current" />, color: 'text-red-500',    bg: 'bg-red-500'    },
  comment:    { icon: <MessageCircle className="w-3.5 h-3.5" />,  color: 'text-blue-500',   bg: 'bg-blue-500'   },
  points:     { icon: <Zap className="w-3.5 h-3.5" />,            color: 'text-yellow-500', bg: 'bg-yellow-400' },
  withdrawal: { icon: <DollarSign className="w-3.5 h-3.5" />,     color: 'text-green-600',  bg: 'bg-green-500'  },
  mention:    { icon: <MessageCircle className="w-3.5 h-3.5" />,  color: 'text-blue-500',   bg: 'bg-blue-500'   },
  system:     { icon: <AlertCircle className="w-3.5 h-3.5" />,    color: 'text-gray-500',   bg: 'bg-gray-400'   },
};

const FILTER_TABS: { label: string; value: NotifType | 'all' }[] = [
  { label: 'All',         value: 'all'        },
  { label: 'Likes',       value: 'like'       },
  { label: 'Comments',    value: 'comment'    },
  { label: 'Follows',     value: 'follow'     },
  { label: 'Points',      value: 'points'     },
  { label: 'Withdrawals', value: 'withdrawal' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarSrc(actor: Notification['actor']) {
  if (actor?.avatar_url) return actor.avatar_url;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${actor?.id ?? 'system'}`;
}

function actorName(actor: Notification['actor']) {
  return actor?.full_name || actor?.username || 'LavLay';
}

function getRelativeTime(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function groupByDay(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  let lastDay = '';
  notifications.forEach(n => {
    const d = new Date(n.created_at);
    const diff = (Date.now() - d.getTime()) / 86400000;
    let label: string;
    if (diff < 1)  label = 'Today';
    else if (diff < 2)  label = 'Yesterday';
    else if (diff < 7)  label = 'This Week';
    else label = d.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' });

    if (label !== lastDay) {
      groups.push({ label, items: [] });
      lastDay = label;
    }
    groups[groups.length - 1].items.push(n);
  });
  return groups;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotifSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 border-b border-gray-50">
      <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    </div>
  );
}

// ─── Notification item ────────────────────────────────────────────────────────

function NotifItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const meta = TYPE_META[n.type] ?? TYPE_META.system;

  const handleClick = () => {
    if (!n.is_read) onRead(n.id);
    // Navigate to relevant content
    if (n.reference_type === 'post' && n.reference_id) navigate(`/feed`);
    else if (n.reference_type === 'user' && n.reference_id) navigate(`/profile/${n.reference_id}`);
    else if (n.reference_type === 'withdrawal') navigate('/wallet/withdraw');
    else if (n.reference_type === 'points_transaction') navigate('/points');
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0 ${!n.is_read ? 'bg-purple-50/50' : ''}`}
      onClick={handleClick}
    >
      {/* Avatar + type badge */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12 ring-2 ring-white">
          <AvatarImage src={avatarSrc(n.actor)} />
          <AvatarFallback className="text-sm font-semibold">{actorName(n.actor)[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${meta.bg} text-white flex items-center justify-center ring-2 ring-white`}>
          {meta.icon}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm leading-snug">
          <span className="font-semibold text-gray-900">{n.title}</span>
        </p>
        {n.body && (
          <p className="text-sm text-gray-600 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
        )}
        <p className={`text-xs mt-1.5 font-medium ${!n.is_read ? meta.color : 'text-gray-400'}`}>
          {getRelativeTime(n.created_at)}
        </p>
      </div>

      {/* Unread dot + chevron */}
      <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
        {!n.is_read && (
          <div className={`w-2.5 h-2.5 rounded-full ${meta.bg}`} />
        )}
        {(n.reference_type && n.reference_type !== 'points_transaction') && (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
      </div>
    </div>
  );
}

// ─── Follow suggestion (shown in notifications when no notifs) ────────────────

interface NotificationsPageProps {
  onNavigate?: (page: string) => void;
  onCartClick?: () => void;
  cartItemsCount?: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function NotificationsPage({ onNavigate, onCartClick, cartItemsCount }: NotificationsPageProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotifType | 'all'>('all');

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
        .limit(150);
      if (error) throw error;
      setNotifications((data ?? []) as unknown as Notification[]);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notif_rt')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await supabase.rpc('mark_notifications_read', { p_user_id: user.id });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const groups = groupByDay(filtered);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onNavigate={onNavigate} onCartClick={onCartClick} cartItemsCount={cartItemsCount} currentPage="notifications" />

      <div className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-4 pb-24 md:pb-6">
        <div className="bg-white sm:rounded-2xl sm:border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-xs text-purple-600 font-medium mt-0.5">{unreadCount} unread</p>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost" size="sm"
                  className="gap-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-xl h-9"
                  onClick={markAllRead}
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
              {FILTER_TABS.map(tab => {
                const count = tab.value === 'all'
                  ? unreadCount
                  : notifications.filter(n => n.type === tab.value && !n.is_read).length;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      filter === tab.value
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                        filter === tab.value ? 'bg-white/30 text-white' : 'bg-purple-600 text-white'
                      }`}>
                        {count > 9 ? '9+' : count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => <NotifSkeleton key={i} />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center px-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mb-5">
                <Bell className="w-10 h-10 text-purple-300" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">
                {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
                {filter === 'all'
                  ? 'When people like your posts, follow you, or comment, you\'ll see it here.'
                  : 'Switch to "All" to see all your notifications.'
                }
              </p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                {/* Day label */}
                <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{group.label}</p>
                </div>
                {group.items.map(n => (
                  <NotifItem key={n.id} n={n} onRead={markOneRead} />
                ))}
              </div>
            ))
          )}

          {/* Footer */}
          {!loading && notifications.length > 0 && (
            <div className="py-6 text-center">
              <p className="text-xs text-gray-300">You're all caught up · Notifications kept for 30 days</p>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav currentPage="notifications" onNavigate={onNavigate} />
    </div>
  );
}
