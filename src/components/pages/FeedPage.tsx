import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../Post';
import { ReelPost } from '../ReelPost';
const ReelsViewerPro = lazy(() => import('../ReelsViewerPro').then(m => ({ default: m.ReelsViewerPro })));
import { ActivityPost } from '../ActivityPost';
import { Sidebar } from '../Sidebar';
import { MobileBottomNav } from '../MobileBottomNav';
import { Button } from '../ui/button';
import { PostSkeleton } from '../ui/skeletons';
import { Crown, Sparkles, Gift, Users2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Helper function to format timestamps
function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  return date.toLocaleDateString();
}

interface FeedPageProps {
  onNavigate?: (page: string, data?: any) => void;
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
}

export function FeedPage({ onNavigate, onCartClick, onAddToCart, cartItemsCount }: FeedPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReelsViewer, setShowReelsViewer] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | undefined>();
  const [openReelComments, setOpenReelComments] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastLoadTimeRef = useRef(0);
  const POSTS_PER_PAGE = 10;

  const fetchFeedData = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        if (loadingMoreRef.current) return; // Prevent double-firing
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
        pageRef.current = 0;
        hasMoreRef.current = true;
      }
      setError(null);

      const currentPage = isLoadMore ? pageRef.current : 0;
      const offset = currentPage * POSTS_PER_PAGE;
      console.log(`🔍 FeedPage: Fetching feed data (page ${currentPage}, offset ${offset})...`);

      // Fetch regular posts with user information
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (
            id,
            username,
            full_name,
            avatar_url,
            subscription_tier,
            subscription_status,
            subscription_expires_at
          ),
          post_images (
            id,
            image_url,
            image_order,
            width,
            height,
            alt_text
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      // Check if there are more posts to load
      const hasMorePosts = postsData && postsData.length === POSTS_PER_PAGE;

      // Only fetch reels on initial load (not on load more)
      let reels: any[] = [];

      if (!isLoadMore) {
        // Fetch reels
        const { data: reelsData, error: reelsError } = await supabase.rpc('get_reels_feed', {
          p_user_id: user?.id || null,
          p_limit: 10,
          p_offset: 0
        });

        // Don't throw error if RPC doesn't exist, just continue without reels
        reels = reelsError ? [] : (reelsData || []);

        // Fetch activities (profile/cover updates)
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            id,
            user_id,
            activity_type,
            content,
            image_url,
            created_at,
            users:user_id (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .in('activity_type', ['profile_update', 'cover_update'])
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(10);

        // Don't throw error if table doesn't exist, just continue without activities
        if (!activitiesError && activitiesData) {
          setActivities(activitiesData);
        } else if (activitiesError) {
          console.error('❌ FeedPage: Error fetching activities:', activitiesError);
        }
      }

      // Transform posts data to match the Post component format
      const transformedPosts = postsData?.map((post: any) => {
        const isVerified = post.users?.subscription_tier === 'pro' &&
                          post.users?.subscription_status === 'active' &&
                          (!post.users?.subscription_expires_at || new Date(post.users.subscription_expires_at) > new Date());

        // Transform post_images array to match the expected format
        const images = post.post_images
          ?.sort((a: any, b: any) => a.image_order - b.image_order)
          .map((img: any) => ({
            url: img.image_url,
            width: img.width,
            height: img.height,
            alt: img.alt_text,
          })) || [];

        return {
          id: post.id,
          created_at: post.created_at,
          author: {
            name: post.users?.full_name || post.users?.username || 'Unknown User',
            username: `@${post.users?.username || 'unknown'}`,
            avatar: post.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            isVerified,
          },
          content: post.content,
          image: post.image_url,
          images: images.length > 0 ? images : undefined,
          images_count: post.images_count || 0,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          shares: post.shares_count || 0,
          timestamp: formatTimestamp(post.created_at),
        };
      }) || [];

      console.log('✅ FeedPage: Loaded', transformedPosts.length, 'posts');

      if (isLoadMore) {
  // Append new posts to existing posts
  setPosts(prev => [...prev, ...transformedPosts]);
  pageRef.current += 1;  // ← INCREMENT PAGE COUNTER
} else {
  // Replace all data on initial load
  setPosts(transformedPosts);
  setReels(reels);
  pageRef.current = 1;   // ← RESET TO 1 ON INITIAL LOAD
}

      // Increment page counter for next load
      pageRef.current = currentPage + 1;
      hasMoreRef.current = hasMorePosts;
      setHasMore(hasMorePosts);

      console.log('📊 Feed load complete:', {
        page: pageRef.current,
        postsLoaded: transformedPosts.length,
        hasMore: hasMorePosts,
        totalPosts: isLoadMore ? posts.length + transformedPosts.length : transformedPosts.length
      });
    } catch (err: any) {
      console.error('❌ FeedPage: Error fetching feed data:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  // Store fetchFeedData in a ref so loadMore always calls the latest version
  const fetchFeedDataRef = useRef(fetchFeedData);
  fetchFeedDataRef.current = fetchFeedData;


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

      console.log('📊 FeedPage: Fetched subscription data:', data);

      // Check if user has active Pro subscription (any paid tier: pro, daily, weekly)
      const paidTiers = ['pro', 'daily', 'weekly', 'starter', 'basic'];
      const isPro = paidTiers.includes(data?.subscription_tier)
        && data?.subscription_status === 'active'
        && (!data?.subscription_expires_at || new Date(data.subscription_expires_at) > new Date());

      console.log('📊 FeedPage: Is Pro?', isPro, 'Tier:', data?.subscription_tier, 'Status:', data?.subscription_status);

      setSubscriptionTier(isPro ? 'pro' : 'free');
    } catch (err) {
      console.error('Error fetching subscription tier:', err);
      setSubscriptionTier('free');
    } finally {
      setLoadingSubscription(false);
    }
  };

  useEffect(() => {
    fetchFeedData();
    if (user) {
      fetchSubscriptionTier();
    }
  }, [user]);

  // Scroll-based infinite loading - fires when user scrolls near bottom
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadTimeRef.current;

      console.log('📜 Scroll:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        distanceFromBottom,
        loading: loadingMoreRef.current,
        hasMore: hasMoreRef.current,
        timeSinceLastLoad
      });

      if (loadingMoreRef.current) {
        console.log('⏸️ Already loading, skipping');
        return;
      }

      if (!hasMoreRef.current) {
        console.log('🛑 No more posts, skipping');
        return;
      }

      // Cooldown: prevent triggering within 2 seconds of last load
      if (timeSinceLastLoad < 2000) {
        console.log('⏱️ Cooldown active (' + Math.ceil((2000 - timeSinceLastLoad) / 1000) + 's remaining)');
        return;
      }

      // Trigger if within 500px of bottom (allow slight overshoot)
      if (distanceFromBottom <= 500 && distanceFromBottom >= -50) {
        console.log('🔥 Triggering load more! Distance: ' + distanceFromBottom.toFixed(1) + 'px');
        lastLoadTimeRef.current = now;
        fetchFeedDataRef.current(true);
      } else if (distanceFromBottom < -50) {
        console.log('🚫 Too far past bottom (' + distanceFromBottom.toFixed(1) + 'px)');
      }
    };

    console.log('✅ Scroll listener attached');
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      console.log('❌ Scroll listener removed');
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleReelClick = (reelId: string, showComments = false) => {
    setSelectedReelId(reelId);
    setOpenReelComments(showComments);
    setShowReelsViewer(true);
  };

  // Mix posts, reels, and activities for a varied feed
  const mixedFeed = useMemo(() => {
    const feed: Array<{ type: 'post' | 'reel' | 'activity'; data: any }> = [];

    posts.forEach(post => feed.push({ type: 'post', data: post }));
    reels.forEach(reel => feed.push({ type: 'reel', data: reel }));
    activities.forEach(activity => feed.push({ type: 'activity', data: activity }));

    // Sort by created_at — most recent first
    feed.sort((a, b) => {
      const dateA = a.data.created_at ? new Date(a.data.created_at).getTime() : 0;
      const dateB = b.data.created_at ? new Date(b.data.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return feed;
  }, [posts, reels, activities]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 pb-40 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Earn Points Announcement Banner - Visible on all screens */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gift className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-1">
                    💰 Earn Withdrawable Points!
                  </h3>
                  <p className="text-sm text-green-800 leading-relaxed">
                    Post content, engage with others, and earn points that you can withdraw directly to your bank account.
                    Every like, comment, share, and post earns you real money! Start earning today.
                  </p>
                </div>
              </div>
            </div>

            <Stories />
            <CreatePost onPostCreated={fetchFeedData} />

            {/* Mobile Referral & Upgrade Cards (hidden on desktop) */}
            <div className="lg:hidden space-y-4">
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
            </div>

            {/* Loading State - Skeleton Loading */}
            {loading && (
              <div className="space-y-4">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-red-600">Error: {error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Feed */}
            {!loading && !error && (
              <div className="space-y-4 sm:space-y-6">
                {mixedFeed.length === 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <p className="text-gray-600">No posts yet. Be the first to share something!</p>
                  </div>
                )}
                {mixedFeed.map((item) => {
                  if (item.type === 'post') {
                    return <Post key={`post-${item.data.id}`} {...item.data} onDelete={() => setPosts(prev => prev.filter(p => p.id !== item.data.id))} />;
                  } else if (item.type === 'reel') {
                    return <ReelPost key={`reel-${item.data.reel_id}`} {...item.data} onReelClick={handleReelClick} />;
                  } else if (item.type === 'activity') {
                    return (
                      <ActivityPost
                        key={`activity-${item.data.id}`}
                        id={item.data.id}
                        user_id={item.data.user_id}
                        user={{
                          username: item.data.users?.username || 'unknown',
                          full_name: item.data.users?.full_name || 'Unknown User',
                          avatar_url: item.data.users?.avatar_url || ''
                        }}
                        activity_type={item.data.activity_type}
                        content={item.data.content}
                        image_url={item.data.image_url}
                        timestamp={formatTimestamp(item.data.created_at)}
                        onDelete={(activityId) => {
                          setActivities(prev => prev.filter(a => a.id !== activityId));
                        }}
                      />
                    );
                  }
                  return null;
                })}

                {/* Load More Section */}
                <div className="py-6">
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading more posts...</span>
                    </div>
                  )}
                  {!loadingMore && hasMore && mixedFeed.length > 0 && (
                    <div className="text-center">
                      <Button
                        onClick={() => fetchFeedData(true)}
                        variant="outline"
                        size="lg"
                        className="w-full max-w-md"
                      >
                        Load More Posts
                      </Button>
                    </div>
                  )}
                  {!hasMore && mixedFeed.length > 0 && (
                    <div className="text-center text-gray-400 text-sm">
                      You've reached the end of your feed
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <Sidebar />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentPage="feed" onNavigate={onNavigate} />

      {/* Reels Viewer (lazy loaded) */}
      {showReelsViewer && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
          <ReelsViewerPro
            initialReelId={selectedReelId}
            openComments={openReelComments}
            onClose={() => {
              setShowReelsViewer(false);
              setSelectedReelId(undefined);
              setOpenReelComments(false);
              fetchFeedData(); // Refresh feed to get updated counts
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
