import { Home, PlaySquare, User, MessageCircle, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MobileBottomNavProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

export function MobileBottomNav({ onNavigate, currentPage }: MobileBottomNavProps) {
  const { user } = useAuth();
  const location = useLocation();
  const activePage = currentPage || location.pathname.slice(1) || 'feed';

  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCounts();

    // Realtime: watch new notifications
    const notifChannel = supabase
      .channel('nav_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchUnreadCounts())
      .subscribe();

    // Realtime: watch conversation updates (unread messages)
    const msgChannel = supabase
      .channel('nav_conversations')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      }, () => fetchUnreadCounts())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      }, () => fetchUnreadCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [user]);

  const fetchUnreadCounts = async () => {
    if (!user?.id) return;
    try {
      // Unread notifications
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotifs(notifCount ?? 0);

      // Unread messages (sum of my_unread across all conversations)
      const { data: convs } = await supabase
        .from('my_conversations')
        .select('my_unread');
      const totalUnread = (convs ?? []).reduce((sum: number, c: any) => sum + (c.my_unread || 0), 0);
      setUnreadMessages(totalUnread);
    } catch {}
  };

  if (!user) return null;

  const navItems = [
    { id: 'feed',          path: '/feed',          icon: Home,          label: 'Home'                                    },
    { id: 'reels',         path: '/reels',         icon: PlaySquare,    label: 'Reels'                                   },
    { id: 'messages',      path: '/messages',      icon: MessageCircle, label: 'Chats',   badge: unreadMessages          },
    { id: 'notifications', path: '/notifications', icon: Bell,          label: 'Alerts',  badge: unreadNotifs            },
    { id: 'profile',       path: '/profile',       icon: User,          label: 'Profile'                                 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activePage === item.id || location.pathname === item.path;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                isActive ? 'text-purple-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'fill-purple-100' : ''}`} />

                {/* Badge */}
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>

              {/* Active dot */}
              {isActive && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
