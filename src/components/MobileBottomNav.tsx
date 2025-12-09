import { Home, PlaySquare, User, TrendingUp, PlusCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const currentPage = location.pathname.slice(1) || 'feed';
  const [pointsBalance, setPointsBalance] = useState(0);

  useEffect(() => {
    console.log('🔍 MobileBottomNav: User state:', user ? `Logged in as ${user.id}` : 'Not logged in');
    if (user) {
      fetchUserPoints();
    }
  }, [user]);

  const fetchUserPoints = async () => {
    if (!user?.id) {
      console.log('❌ MobileBottomNav: No user ID, skipping points fetch');
      return;
    }

    try {
      console.log('🔍 MobileBottomNav: Fetching points for user:', user.id);
      const { data, error } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ MobileBottomNav: Error fetching points:', error);
        // Don't throw, just set to 0
        setPointsBalance(0);
        return;
      }
      console.log('✅ MobileBottomNav: Points fetched:', data?.points_balance || 0);
      setPointsBalance(data?.points_balance || 0);
    } catch (err) {
      console.error('❌ MobileBottomNav: Exception fetching user points:', err);
      // Set default points on error so component still works
      setPointsBalance(0);
    }
  };

  // Format numbers: 1000 -> 1k, 10000 -> 10k, etc.
  const formatPoints = (points: number): string => {
    if (points >= 1000000) {
      return `${(points / 1000000).toFixed(1)}M`;
    }
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  };

  const navItems = [
    {
      id: 'feed',
      path: '/feed',
      icon: Home,
      label: 'Home',
    },
    {
      id: 'reels',
      path: '/reels',
      icon: PlaySquare,
      label: 'Reels',
    },
    {
      id: 'create',
      path: '/create-product',
      icon: PlusCircle,
      label: 'Create',
      isCreate: true,
    },
    {
      id: 'points',
      path: '/points',
      icon: TrendingUp,
      label: formatPoints(pointsBalance),
      isPoints: true,
    },
    {
      id: 'profile',
      path: '/profile',
      icon: User,
      label: 'Profile',
    },
  ];

  // Temporarily show nav even if not logged in for debugging
  // if (!user) return null;
  console.log('🎨 MobileBottomNav: Rendering bottom nav');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              {item.isCreate ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{item.label}</span>
                </div>
              ) : item.isPoints ? (
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-xs font-bold mt-1 ${
                    isActive ? 'text-purple-600' : 'text-gray-700'
                  }`}>
                    {item.label}
                  </span>
                </div>
              ) : (
                <>
                  <Icon className={`w-6 h-6 ${isActive ? 'fill-purple-600' : ''}`} />
                  <span className="text-xs mt-1">{item.label}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
