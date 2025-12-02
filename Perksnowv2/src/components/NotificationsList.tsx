import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Card } from './ui/card';
import { Heart, MessageCircle, UserPlus, AtSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention';
  message: string;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  post_id?: string;
  comment_id?: string;
}

interface NotificationsListProps {
  onNavigate?: (page: string) => void;
}

export function NotificationsList({ onNavigate }: NotificationsListProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch notifications
      const { data: notificationsData, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type, message, is_read, created_at, post_id, comment_id, actor_id')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      // Fetch actor information for each notification
      const notificationsWithActors = await Promise.all(
        (notificationsData || []).map(async (notification: any) => {
          const { data: actorData } = await supabase
            .from('users')
            .select('username, full_name, avatar_url')
            .eq('id', notification.actor_id)
            .single();

          return {
            ...notification,
            actor: actorData || { username: 'Unknown', full_name: null, avatar_url: null },
          };
        })
      );

      setNotifications(notificationsWithActors);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateError) throw updateError;

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Navigate to relevant page based on notification type
    if (notification.post_id) {
      onNavigate?.('feed');
    } else if (notification.type === 'follow') {
      onNavigate?.('profile');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-purple-500" />;
      default:
        return <Heart className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchNotifications}
          className="mt-4 text-purple-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Heart className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">No notifications yet</p>
        <p className="text-sm text-gray-400 mt-1">
          When someone interacts with your posts, you'll see it here
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
            !notification.is_read ? 'bg-blue-50/50' : ''
          }`}
          onClick={() => handleNotificationClick(notification)}
        >
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0">
              <AvatarImage src={notification.actor.avatar_url || undefined} />
              <AvatarFallback>
                {notification.actor.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">
                  <span className="font-medium">
                    {notification.actor.full_name || notification.actor.username}
                  </span>{' '}
                  <span className="text-gray-600">
                    {notification.message.replace(
                      notification.actor.full_name || notification.actor.username,
                      ''
                    )}
                  </span>
                </p>
                <div className="flex-shrink-0">{getIcon(notification.type)}</div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatTimestamp(notification.created_at)}
                </span>
                {!notification.is_read && (
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
