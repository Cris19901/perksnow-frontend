import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../Post';
import { ProductPost } from '../ProductPost';
import { ReelPost } from '../ReelPost';
import { ReelsViewer } from '../ReelsViewerV2';
import { Sidebar } from '../Sidebar';
import { MobileBottomNav } from '../MobileBottomNav';
import { Button } from '../ui/button';
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
  const [products, setProducts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReelsViewer, setShowReelsViewer] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | undefined>();
  const [openReelComments, setOpenReelComments] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const POSTS_PER_PAGE = 10;

  const fetchFeedData = async (isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(0);
      }
      setError(null);

      const currentPage = isLoadMore ? page : 0;
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

      console.log('🔍 FeedPage: Fetched posts with images:', postsData);

      // Only fetch products and reels on initial load (not on load more)
      let productsData: any[] = [];
      let reels: any[] = [];

      if (!isLoadMore) {
        // Fetch products with seller information
        const { data: fetchedProducts, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            users:seller_id (
              id,
              username,
              full_name,
              avatar_url,
              subscription_tier,
              subscription_status,
              subscription_expires_at
            )
          `)
          .eq('is_available', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (productsError) throw productsError;
        productsData = fetchedProducts || [];

        // Fetch reels
        const { data: reelsData, error: reelsError } = await supabase.rpc('get_reels_feed', {
          p_user_id: user?.id || null,
          p_limit: 10,
          p_offset: 0
        });

        // Don't throw error if RPC doesn't exist, just continue without reels
        reels = reelsError ? [] : (reelsData || []);
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
          author: {
            name: post.users?.full_name || post.users?.username || 'Unknown User',
            username: `@${post.users?.username || 'unknown'}`,
            avatar: post.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            isVerified,
          },
          content: post.content,
          image: post.image_url, // Keep for backwards compatibility
          images: images.length > 0 ? images : undefined,
          images_count: post.images_count || 0,
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          shares: post.shares_count || 0,
          timestamp: formatTimestamp(post.created_at),
        };
      }) || [];

      // Transform products data to match the ProductPost component format
      const transformedProducts = productsData?.map((product: any) => {
        const isVerified = product.users?.subscription_tier === 'pro' &&
                          product.users?.subscription_status === 'active' &&
                          (!product.users?.subscription_expires_at || new Date(product.users.subscription_expires_at) > new Date());

        return {
          id: product.id,
          author: {
            name: product.users?.full_name || product.users?.username || 'Unknown Seller',
            username: `@${product.users?.username || 'unknown'}`,
            avatar: product.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            isVerified,
          },
          content: product.description,
          product: {
            name: product.title,
            price: product.price,
            image: product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
            category: product.category || 'General',
          },
          likes: product.likes_count || 0,
          comments: 0,
          shares: 0,
          timestamp: formatTimestamp(product.created_at),
        };
      }) || [];

      console.log('✅ FeedPage: Loaded', transformedPosts.length, 'posts,', transformedProducts.length, 'products, and', reels.length, 'reels');

      if (isLoadMore) {
        // Append new posts to existing posts
        setPosts(prev => [...prev, ...transformedPosts]);
        setPage(prev => prev + 1);
      } else {
        // Replace all data on initial load
        setPosts(transformedPosts);
        setProducts(transformedProducts);
        setReels(reels);
      }

      setHasMore(hasMorePosts);
    } catch (err: any) {
      console.error('❌ FeedPage: Error fetching feed data:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more callback for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchFeedData(true);
    }
  }, [loadingMore, hasMore, loading, page]);

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
      const paidTiers = ['pro', 'daily', 'weekly'];
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

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadingMore, loadMore]);

  const handleReelClick = (reelId: string, showComments = false) => {
    setSelectedReelId(reelId);
    setOpenReelComments(showComments);
    setShowReelsViewer(true);
  };

  // Mix posts, products, and reels for a varied feed with shuffling
  const createMixedFeed = () => {
    const feed: Array<{ type: 'post' | 'product' | 'reel'; data: any }> = [];

    // Add all posts
    posts.forEach(post => feed.push({ type: 'post', data: post }));

    // Add all products
    products.forEach(product => feed.push({ type: 'product', data: product }));

    // Add all reels
    reels.forEach(reel => feed.push({ type: 'reel', data: reel }));

    // Sort by created_at first
    const sortedFeed = feed.sort((a, b) => {
      const dateA = a.data.created_at ? new Date(a.data.created_at).getTime() : 0;
      const dateB = b.data.created_at ? new Date(b.data.created_at).getTime() : 0;
      return dateB - dateA; // Most recent first
    });

    // Shuffle algorithm (Fisher-Yates) - randomizes feed on each render/refresh
    const shuffledFeed = [...sortedFeed];
    for (let i = shuffledFeed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledFeed[i], shuffledFeed[j]] = [shuffledFeed[j], shuffledFeed[i]];
    }

    return shuffledFeed;
  };

  const mixedFeed = createMixedFeed();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={onNavigate}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 pb-28 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="space-y-4 sm:space-y-6">
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

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading your feed...</p>
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
                {mixedFeed.map((item, index) => {
                  if (item.type === 'post') {
                    return <Post key={`post-${item.data.id}`} {...item.data} />;
                  } else if (item.type === 'product') {
                    return <ProductPost key={`product-${item.data.id}`} {...item.data} onAddToCart={onAddToCart} />;
                  } else if (item.type === 'reel') {
                    return <ReelPost key={`reel-${item.data.reel_id}`} {...item.data} onReelClick={handleReelClick} />;
                  }
                  return null;
                })}

                {/* Infinite Scroll Trigger / Load More */}
                <div ref={loadMoreRef} className="py-4">
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading more posts...</span>
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

      {/* Reels Viewer */}
      {showReelsViewer && (
        <ReelsViewer
          initialReelId={selectedReelId}
          openComments={openReelComments}
          onClose={() => {
            setShowReelsViewer(false);
            setSelectedReelId(undefined);
            setOpenReelComments(false);
            fetchFeedData(); // Refresh feed to get updated counts
          }}
        />
      )}
    </div>
  );
}
