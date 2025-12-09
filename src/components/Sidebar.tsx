import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { TrendingUp, UserPlus, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SuggestedUser {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  followers_count: number;
}

interface TrendingTag {
  id: string;
  tag: string;
  posts_count: number;
}

export function Sidebar() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    fetchSuggestedUsers();
    fetchTrending();
  }, [user]);

  const fetchSuggestedUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('🔍 Sidebar: Fetching suggested users...');

      // Fetch users (excluding current user)
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, followers_count')
        .neq('id', user?.id || '')
        .order('followers_count', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Sidebar: Error fetching users:', error);
        return;
      }

      console.log('✅ Sidebar: Loaded', data?.length || 0, 'suggested users');
      setSuggestedUsers(data || []);
    } catch (err) {
      console.error('❌ Sidebar: Exception fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTrending = async () => {
    try {
      setLoadingTrending(true);
      console.log('🔍 Sidebar: Fetching trending tags...');

      // Try to fetch from hashtags table if it exists
      const { data: hashtagData, error: hashtagError } = await supabase
        .from('hashtags')
        .select('id, tag, posts_count')
        .order('posts_count', { ascending: false })
        .limit(5);

      if (!hashtagError && hashtagData && hashtagData.length > 0) {
        console.log('✅ Sidebar: Loaded trending from hashtags table');
        setTrending(hashtagData.map(h => ({
          id: h.id,
          tag: h.tag.startsWith('#') ? h.tag : `#${h.tag}`,
          posts_count: h.posts_count || 0
        })));
        return;
      }

      // Fallback: Generate trending from post categories/content
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('category, content')
        .not('category', 'is', null)
        .limit(50);

      if (!postsError && postsData && postsData.length > 0) {
        // Count categories
        const categoryCounts: Record<string, number> = {};
        postsData.forEach(post => {
          if (post.category) {
            categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
          }
        });

        const trendingFromCategories = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, count], index) => ({
            id: `cat-${index}`,
            tag: `#${cat.replace(/\s+/g, '')}`,
            posts_count: count
          }));

        if (trendingFromCategories.length > 0) {
          console.log('✅ Sidebar: Generated trending from categories');
          setTrending(trendingFromCategories);
          return;
        }
      }

      // Final fallback: Generate trending from product categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .limit(50);

      if (!productsError && productsData && productsData.length > 0) {
        const categoryCounts: Record<string, number> = {};
        productsData.forEach(product => {
          if (product.category) {
            categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
          }
        });

        const trendingFromProducts = Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, count], index) => ({
            id: `prod-${index}`,
            tag: `#${cat.replace(/\s+/g, '')}`,
            posts_count: count
          }));

        console.log('✅ Sidebar: Generated trending from product categories');
        setTrending(trendingFromProducts);
      } else {
        console.log('🔍 Sidebar: No trending data available');
        setTrending([]);
      }
    } catch (err) {
      console.error('❌ Sidebar: Exception fetching trending:', err);
    } finally {
      setLoadingTrending(false);
    }
  };

  const getAvatarUrl = (userItem: SuggestedUser) => {
    return userItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.id}`;
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-4">
      {/* Suggested for you */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <span>Suggestions For You</span>
          <Button variant="link" size="sm" className="p-0 h-auto">
            See All
          </Button>
        </div>
        <div className="space-y-4">
          {loadingUsers ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : suggestedUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No suggestions yet</p>
          ) : (
            suggestedUsers.map((userItem) => (
              <div key={userItem.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={getAvatarUrl(userItem)} />
                    <AvatarFallback>
                      {(userItem.full_name || userItem.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm">{userItem.full_name || userItem.username}</p>
                    <p className="text-xs text-gray-500">
                      {formatCount(userItem.followers_count || 0)} followers
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trending */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <span>Trending</span>
        </div>
        <div className="space-y-3">
          {loadingTrending ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : trending.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No trending topics yet</p>
          ) : (
            trending.map((item) => (
              <div key={item.id} className="cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
                <p className="text-blue-600">{item.tag}</p>
                <p className="text-xs text-gray-500">{formatCount(item.posts_count)} posts</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 text-xs text-gray-500 space-y-2">
        <div className="flex flex-wrap gap-2">
          <a href="#" className="hover:underline">About</a>
          <span>·</span>
          <a href="#" className="hover:underline">Help</a>
          <span>·</span>
          <a href="#" className="hover:underline">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:underline">Terms</a>
        </div>
        <p>© 2025 SocialHub</p>
      </div>
    </div>
  );
}
