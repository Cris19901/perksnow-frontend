import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../Post';
import { ProductPost } from '../ProductPost';
import { ReelPost } from '../ReelPost';
import { ReelsViewer } from '../ReelsViewer';
import { Sidebar } from '../Sidebar';
import { MobileBottomNav } from '../MobileBottomNav';
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
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReelsViewer, setShowReelsViewer] = useState(false);
  const [selectedReelId, setSelectedReelId] = useState<string | undefined>();

  const fetchFeedData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 FeedPage: Fetching feed data from Supabase...');

      // Fetch regular posts with user information
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Fetch products with seller information
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          users:seller_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (productsError) throw productsError;

      // Fetch reels
      const { data: reelsData, error: reelsError } = await supabase.rpc('get_reels_feed', {
        p_user_id: user?.id || null,
        p_limit: 10,
        p_offset: 0
      });

      // Don't throw error if RPC doesn't exist, just continue without reels
      const reels = reelsError ? [] : (reelsData || []);

      // Transform posts data to match the Post component format
      const transformedPosts = postsData?.map((post: any) => ({
        id: post.id,
        author: {
          name: post.users?.full_name || post.users?.username || 'Unknown User',
          username: `@${post.users?.username || 'unknown'}`,
          avatar: post.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        },
        content: post.content,
        image: post.image_url,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        shares: post.shares_count || 0,
        timestamp: formatTimestamp(post.created_at),
      })) || [];

      // Transform products data to match the ProductPost component format
      const transformedProducts = productsData?.map((product: any) => ({
        id: product.id,
        author: {
          name: product.users?.full_name || product.users?.username || 'Unknown Seller',
          username: `@${product.users?.username || 'unknown'}`,
          avatar: product.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
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
      })) || [];

      console.log('✅ FeedPage: Loaded', transformedPosts.length, 'posts,', transformedProducts.length, 'products, and', reels.length, 'reels');
      setPosts(transformedPosts);
      setProducts(transformedProducts);
      setReels(reels);
    } catch (err: any) {
      console.error('❌ FeedPage: Error fetching feed data:', err);
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedData();
  }, []);

  const handleReelClick = (reelId: string) => {
    setSelectedReelId(reelId);
    setShowReelsViewer(true);
  };

  // Mix posts, products, and reels for a varied feed
  const createMixedFeed = () => {
    const feed: Array<{ type: 'post' | 'product' | 'reel'; data: any }> = [];

    // Add all posts
    posts.forEach(post => feed.push({ type: 'post', data: post }));

    // Add all products
    products.forEach(product => feed.push({ type: 'product', data: product }));

    // Add all reels
    reels.forEach(reel => feed.push({ type: 'reel', data: reel }));

    // Sort by created_at if available, otherwise maintain order
    return feed.sort((a, b) => {
      const dateA = a.data.created_at ? new Date(a.data.created_at).getTime() : 0;
      const dateB = b.data.created_at ? new Date(b.data.created_at).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
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

      <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="space-y-4 sm:space-y-6">
            <Stories />
            <CreatePost onPostCreated={fetchFeedData} />

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
          onClose={() => {
            setShowReelsViewer(false);
            setSelectedReelId(undefined);
            fetchFeedData(); // Refresh feed to get updated counts
          }}
        />
      )}
    </div>
  );
}
