import { Home, PlaySquare, User, TrendingUp, Bell, PlusCircle, Image, Video, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const activePage = currentPage || location.pathname.slice(1) || 'feed';

  const [pointsBalance, setPointsBalance] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPoints();
    fetchUnreadCounts();

    const notifChannel = supabase
      .channel('nav_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchUnreadCounts())
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
    };
  }, [user]);

  const fetchPoints = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', user.id)
        .single();
      setPointsBalance(data?.points_balance || 0);
    } catch {}
  };

  const fetchUnreadCounts = async () => {
    if (!user?.id) return;
    try {
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotifs(notifCount ?? 0);
    } catch {}
  };

  const formatPoints = (pts: number) => {
    if (pts >= 1_000_000) return `${(pts / 1_000_000).toFixed(1)}M`;
    if (pts >= 1_000)     return `${(pts / 1_000).toFixed(1)}k`;
    return pts.toString();
  };

  if (!user) return null;

  const navItems = [
    { id: 'feed',          path: '/feed',          icon: Home,       label: 'Home'                                              },
    { id: 'reels',         path: '/reels',         icon: PlaySquare, label: 'Reels'                                             },
    { id: 'create',        path: '#',              icon: PlusCircle, label: 'Create', isCreate: true                            },
    { id: 'notifications', path: '/notifications', icon: Bell,       label: 'Alerts', badge: unreadNotifs                       },
    { id: 'points',        path: '/points',        icon: TrendingUp, label: formatPoints(pointsBalance), isPoints: true         },
    { id: 'profile',       path: '/profile',       icon: User,       label: 'Profile'                                           },
  ];

  return (
    <>
      {/* Create menu overlay */}
      {showCreateMenu && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setShowCreateMenu(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Menu card - positioned above the nav bar */}
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-56"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-purple-50 transition-colors"
              onClick={() => {
                setShowCreateMenu(false);
                navigate('/feed', { state: { focusCreate: true } });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Image className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-900">New Post</p>
                <p className="text-[11px] text-gray-500">Photo, text, or link</p>
              </div>
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-pink-50 transition-colors"
              onClick={() => {
                setShowCreateMenu(false);
                navigate('/reels', { state: { openUpload: true } });
              }}
            >
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <Video className="w-5 h-5 text-pink-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-900">Upload Reel</p>
                <p className="text-[11px] text-gray-500">Short video clip</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id || location.pathname === item.path;

            // Create button — opens menu instead of navigating
            if (item.isCreate) {
              return (
                <button
                  key={item.id}
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors text-gray-500"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                    {showCreateMenu
                      ? <X className="w-4 h-4 text-white" />
                      : <PlusCircle className="w-4.5 h-4.5 text-white" />
                    }
                  </div>
                  <span className="text-[10px] font-medium leading-none">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                  isActive ? 'text-purple-600' : 'text-gray-500'
                }`}
              >
                <div className="relative">
                  {item.isPoints && isActive ? (
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : (
                    <Icon className={`w-6 h-6 ${isActive && !item.isPoints ? 'fill-purple-100' : ''}`} />
                  )}

                  {/* Badge */}
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>

                <span className={`text-[10px] font-medium leading-none ${
                  item.isPoints ? (isActive ? 'text-purple-600 font-bold' : 'text-gray-700 font-semibold') : ''
                }`}>
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
    </>
  );
}
