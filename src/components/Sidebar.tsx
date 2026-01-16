import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { TrendingUp, UserPlus, Loader2, UserCheck, Crown, Sparkles, Gift, Users2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { sendFollowerNotification } from '@/lib/email';

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
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [trending, setTrending] = useState<TrendingTag[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set());
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    fetchSuggestedUsers();
    fetchTrending();
    if (user) {
      fetchFollowing();
      fetchSubscriptionTier();
    }
  }, [user]);

  const fetchSubscriptionTier = async () => {
    if (!user) return;

    try {
      setLoadingSubscription(true);
      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier, subscription_status, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Check if user has active Pro subscription
      const isPro = data?.subscription_tier === 'pro'
        && data?.subscription_status === 'active'
        && (!data?.subscription_expires_at || new Date(data.subscription_expires_at) > new Date());

      setSubscriptionTier(isPro ? 'pro' : 'free');
    } catch (err) {
      console.error('Error fetching subscription tier:', err);
      setSubscriptionTier('free');
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;

      const followingSet = new Set(data?.map(f => f.following_id) || []);
      setFollowingIds(followingSet);
    } catch (err) {
      console.error('Error fetching following:', err);
    }
  };

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

      // Generate trending from product categories (most reliable source)
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

        if (trendingFromProducts.length > 0) {
          console.log('✅ Sidebar: Generated trending from product categories');
          setTrending(trendingFromProducts);
          return;
        }
      }

      // If no products, show empty
      console.log('🔍 Sidebar: No trending data available');
      setTrending([]);
    } catch (err) {
      console.error('❌ Sidebar: Exception fetching trending:', err);
      setTrending([]);
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

  const handleFollow = async (targetUserId: string) => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    if (followingInProgress.has(targetUserId)) {
      return; // Prevent double-clicking
    }

    try {
      setFollowingInProgress(prev => new Set(prev).add(targetUserId));

      const isFollowing = followingIds.has(targetUserId);

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId);

        if (error) throw error;

        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });

        toast.success('Unfollowed successfully');
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          });

        if (error) throw error;

        setFollowingIds(prev => new Set(prev).add(targetUserId));
        toast.success('Following successfully');

        // Send follower notification email
        const targetUser = suggestedUsers.find(u => u.id === targetUserId);
        if (targetUser) {
          // Get target user's email
          const { data: targetUserData } = await supabase
            .from('users')
            .select('email, full_name, username')
            .eq('id', targetUserId)
            .single();

          // Get current user's info
          const { data: currentUserData } = await supabase
            .from('users')
            .select('full_name, username')
            .eq('id', user.id)
            .single();

          if (targetUserData?.email && currentUserData) {
            sendFollowerNotification(
              targetUserData.email,
              targetUserData.full_name || targetUserData.username,
              currentUserData.full_name || currentUserData.username,
              currentUserData.username
            ).catch(err => console.error('Follower notification failed:', err));
          }
        }
      }
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      toast.error('Failed to update follow status');
    } finally {
      setFollowingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Referral Program Card */}
      {user && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Earn with Referrals</h3>
              <p className="text-sm text-gray-600 mb-3">
                Invite friends and earn 20 points + 5% of their deposits
              </p>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => navigate('/referrals')}
              >
                <Users2 className="w-4 h-4 mr-2" />
                View Referral Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade to Pro Banner (Only for Free Users) */}
      {!loadingSubscription && subscriptionTier === 'free' && user && (
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-lg p-4 text-white shadow-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Crown className="w-5 h-5 text-yellow-300" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                Upgrade to Pro
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </h3>
              <p className="text-sm text-white/90 leading-relaxed">
                Unlock withdrawals, verified badge, unlimited posts & reels, and priority support!
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/subscription')}
            className="w-full bg-white text-purple-600 hover:bg-gray-100 font-semibold"
            size="sm"
          >
            View Plans
          </Button>
        </div>
      )}

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
            suggestedUsers.map((userItem) => {
              const isFollowing = followingIds.has(userItem.id);
              const isLoading = followingInProgress.has(userItem.id);

              return (
                <div key={userItem.id} className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => navigate(`/profile/${userItem.username}`)}
                  >
                    <Avatar>
                      <AvatarImage src={getAvatarUrl(userItem)} />
                      <AvatarFallback>
                        {(userItem.full_name || userItem.username || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium hover:underline">{userItem.full_name || userItem.username}</p>
                      <p className="text-xs text-gray-500">
                        {formatCount(userItem.followers_count || 0)} followers
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isFollowing ? "default" : "outline"}
                    className="gap-1"
                    onClick={() => handleFollow(userItem.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowing ? (
                      <UserCheck className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              );
            })
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
              <div
                key={item.id}
                onClick={() => {
                  const hashtagText = item.tag.replace('#', '');
                  navigate(`/hashtag/${hashtagText}`);
                }}
                className="cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
              >
                <p className="text-blue-600 font-medium">{item.tag}</p>
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
        <p>© 2025 LavLay</p>
      </div>
    </div>
  );
}
