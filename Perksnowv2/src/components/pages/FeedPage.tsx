import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Stories } from '../Stories';
import { CreatePost } from '../CreatePost';
import { Post } from '../Post';
import { ProductPost } from '../ProductPost';
import { Sidebar } from '../Sidebar';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, Users, TrendingUp, Filter, X } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet';

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
  onCartClick?: () => void;
  onAddToCart?: (id: number) => void;
  cartItemsCount?: number;
}

export function FeedPage({ onCartClick, onAddToCart, cartItemsCount }: FeedPageProps) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'products'>('all');

  const fetchFeedData = async () => {
    console.log('🚀 FeedPage: Fetching from Supabase...');
      try {
        setLoading(true);
        setError(null);

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

        // Transform posts data to match the Post component format
        const transformedPosts = postsData?.map((post: any) => ({
          id: post.id,
          author: {
            name: post.users?.full_name || post.users?.username || 'Unknown User',
            username: `@${post.users?.username || 'unknown'}`,
            avatar: post.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
            userId: post.users?.id, // Add userId for navigation to profile
          },
          content: post.content,
          image: post.image_url, // Keep for backwards compatibility
          images: post.image_urls, // Use image_urls array for multiple images
          video: post.video_url, // Video URL
          feeling: post.feeling, // Feeling/activity
          location: post.location, // Location tag
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
            userId: product.users?.id, // Add userId for navigation to profile
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

        setPosts(transformedPosts);
        setProducts(transformedProducts);
      } catch (err: any) {
        console.error('Error fetching feed data:', err);
        setError(err.message || 'Failed to load feed');
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchFeedData();
  }, []);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Header
          onNavigate={(page) => navigate(`/${page}`)}
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="feed"
        />

        <div className="max-w-[1400px] mx-auto px-4 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 sm:gap-6">
            {/* Main Content */}
            <div className="space-y-4 sm:space-y-6">
              {/* Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    filterType === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                  }`}
                >
                  All Posts
                </button>
                <button
                  onClick={() => setFilterType('posts')}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    filterType === 'posts'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                  }`}
                >
                  Social Posts
                </button>
                <button
                  onClick={() => setFilterType('products')}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    filterType === 'products'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'
                  }`}
                >
                  Products
                </button>
              </div>

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
                  {posts.length === 0 && products.length === 0 && (
                    <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                      <p className="text-lg font-medium text-gray-700 mb-2">No posts yet</p>
                      <p className="text-sm text-gray-500">Be the first to share something!</p>
                    </div>
                  )}
                  {(filterType === 'all' || filterType === 'posts') && posts.map((post) => (
                    <Post key={post.id} {...post} />
                  ))}
                  {(filterType === 'all' || filterType === 'products') && products.map((post) => (
                    <ProductPost key={post.id} {...post} onAddToCart={onAddToCart} />
                  ))}
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
      </div>

      {/* Mobile Quick Actions - Floating Action Button */}
      {/* Quick Actions Menu - Now outside main container */}
      {showQuickActions && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'block'
            }}
            onClick={() => {
              setShowQuickActions(false);
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: '6rem',
              right: '1rem',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/create-product');
                setShowQuickActions(false);
              }}
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 16px',
                borderRadius: '9999px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '2px solid #9333ea'
              }}
            >
              <div style={{
                backgroundColor: '#f3e8ff',
                padding: '8px',
                borderRadius: '9999px'
              }}>
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              <span style={{ fontWeight: 500, color: '#374151' }}>Sell Product</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/marketplace');
                setShowQuickActions(false);
              }}
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 16px',
                borderRadius: '9999px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '2px solid #2563eb'
              }}
            >
              <div style={{
                backgroundColor: '#dbeafe',
                padding: '8px',
                borderRadius: '9999px'
              }}>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span style={{ fontWeight: 500, color: '#374151' }}>Marketplace</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/points');
                setShowQuickActions(false);
              }}
              style={{
                backgroundColor: '#ffffff',
                padding: '12px 16px',
                borderRadius: '9999px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '2px solid #16a34a'
              }}
            >
              <div style={{
                backgroundColor: '#dcfce7',
                padding: '8px',
                borderRadius: '9999px'
              }}>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span style={{ fontWeight: 500, color: '#374151' }}>My Points</span>
            </button>
          </div>
        </>
      )}

      {/* FAB - Floating Action Button - Now outside main container, shows on mobile/tablet only */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowQuickActions(!showQuickActions);
        }}
        className={`fixed p-4 rounded-full shadow-2xl transition-all duration-300 ${
          showQuickActions
            ? 'bg-gray-700 rotate-45'
            : 'bg-gradient-to-r from-purple-600 to-pink-600'
        }`}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1rem',
          zIndex: 9999,
          display: 'block'
        }}
        aria-label="Quick actions menu"
      >
        <Plus className="w-6 h-6 text-white" />
      </button>
    </>
  );
}
