import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { TrendingUp, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SuggestedUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  followers_count: number;
}

interface TrendingHashtag {
  tag: string;
  count: number;
}

export function Sidebar() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchSuggestedUsers();
      fetchTrending();
    }
  }, [user]);

  async function fetchSuggestedUsers() {
    try {
      // First, get users that the current user is already following
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id || '');

      if (followsError) throw followsError;

      const followingSet = new Set(followsData?.map((f) => f.following_id) || []);
      setFollowingIds(followingSet);

      // Get suggested users (not following, excluding self)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, full_name, avatar_url, followers_count')
        .neq('id', user?.id || '')
        .not('id', 'in', `(${Array.from(followingSet).join(',') || 'null'})`)
        .order('followers_count', { ascending: false })
        .limit(5);

      if (usersError) throw usersError;

      setSuggestedUsers(usersData || []);
    } catch (err) {
      console.error('Error fetching suggested users:', err);
    }
  }

  async function fetchTrending() {
    try {
      // Get posts from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('content')
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('content', 'is', null);

      if (postsError) throw postsError;

      // Extract hashtags from posts
      const hashtagCounts: Record<string, number> = {};

      postsData?.forEach((post) => {
        const hashtags = post.content.match(/#\w+/g) || [];
        hashtags.forEach((tag) => {
          const normalizedTag = tag.toLowerCase();
          hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1;
        });
      });

      // Sort by count and get top 5
      const trendingArray = Object.entries(hashtagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTrending(trendingArray);
    } catch (err) {
      console.error('Error fetching trending:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollow(userId: string) {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    try {
      // Add follow relationship
      const { error: insertError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (insertError) throw insertError;

      // Update followers count for target user
      const targetUser = suggestedUsers.find((u) => u.id === userId);
      if (targetUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ followers_count: (targetUser.followers_count || 0) + 1 })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      // Update current user's following count
      const { data: currentUserData } = await supabase
        .from('users')
        .select('following_count')
        .eq('id', user.id)
        .single();

      const { error: currentError } = await supabase
        .from('users')
        .update({ following_count: (currentUserData?.following_count || 0) + 1 })
        .eq('id', user.id);

      if (currentError) throw currentError;

      // Update local state
      setFollowingIds(new Set([...followingIds, userId]));
      setSuggestedUsers(suggestedUsers.filter((u) => u.id !== userId));

      toast.success('Following user successfully');
    } catch (err: any) {
      console.error('Error following user:', err);
      toast.error('Failed to follow user');
    }
  }

  function formatCount(count: number): string {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }
  if (!user) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Suggested for you */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold">Suggestions For You</span>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : suggestedUsers.length > 0 ? (
          <div className="space-y-4">
            {suggestedUsers.map((suggestedUser) => (
              <div key={suggestedUser.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={suggestedUser.avatar_url} />
                    <AvatarFallback>
                      {suggestedUser.full_name?.[0] || suggestedUser.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {suggestedUser.full_name || suggestedUser.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      @{suggestedUser.username} · {formatCount(suggestedUser.followers_count || 0)} followers
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => handleFollow(suggestedUser.id)}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No suggestions available</p>
        )}
      </div>

      {/* Trending */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold">Trending</span>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : trending.length > 0 ? (
          <div className="space-y-3">
            {trending.map((item, index) => (
              <div
                key={index}
                className="cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <p className="text-blue-600 font-medium">{item.tag}</p>
                <p className="text-xs text-gray-500">{formatCount(item.count)} posts</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No trending topics yet</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 text-xs text-gray-500 space-y-2">
        <div className="flex flex-wrap gap-2">
          <a href="/about" className="hover:underline">About</a>
          <span>·</span>
          <a href="#" className="hover:underline">Help</a>
          <span>·</span>
          <a href="#" className="hover:underline">Privacy</a>
          <span>·</span>
          <a href="#" className="hover:underline">Terms</a>
        </div>
        <p>© 2025 Perknow</p>
      </div>
    </div>
  );
}
