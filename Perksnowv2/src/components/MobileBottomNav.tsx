import { Home, PlaySquare, User, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface MobileBottomNavProps {
  currentPage?: string;
}

export function MobileBottomNav({ currentPage = 'feed' }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pointsBalance, setPointsBalance] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserPoints();
    }
  }, [user]);

  const fetchUserPoints = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('points_balance')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setPointsBalance(data?.points_balance || 0);
    } catch (err) {
      console.error('Error fetching user points:', err);
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
      icon: Home,
      label: 'Home',
      onClick: () => navigate('/feed'),
    },
    {
      id: 'reels',
      icon: PlaySquare,
      label: 'Reels',
      onClick: () => navigate('/reels'),
    },
    {
      id: 'points',
      icon: TrendingUp,
      label: formatPoints(pointsBalance),
      onClick: () => navigate('/points'),
      isPoints: true,
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      onClick: () => navigate(`/profile/${user?.id}`),
    },
  ];

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-purple-600' : 'text-gray-600'
              }`}
            >
              {item.isPoints ? (
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
            </button>
          );
        })}
      </div>
    </nav>
  );
}
