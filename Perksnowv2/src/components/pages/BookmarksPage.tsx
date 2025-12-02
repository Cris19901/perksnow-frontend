import { useState, useEffect } from 'react';
import { Header } from '../Header';
import { Post } from '../Post';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';

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

interface BookmarksPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function BookmarksPage({ onCartClick, cartItemsCount }: BookmarksPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookmarkedPosts() {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);

        // Fetch bookmarked posts with user information
        const { data: bookmarksData, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select(`
            id,
            created_at,
            posts (
              id,
              content,
              image_url,
              image_urls,
              likes_count,
              comments_count,
              shares_count,
              created_at,
              users:user_id (
                id,
                username,
                full_name,
                avatar_url
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (bookmarksError) throw bookmarksError;

        // Transform bookmarks data to match the Post component format
        const transformedPosts = bookmarksData
          ?.filter((bookmark: any) => bookmark.posts) // Filter out bookmarks with deleted posts
          .map((bookmark: any) => {
            const post = bookmark.posts;
            return {
              id: post.id,
              author: {
                name: post.users?.full_name || post.users?.username || 'Unknown User',
                username: `@${post.users?.username || 'unknown'}`,
                avatar: post.users?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
                userId: post.users?.id,
              },
              content: post.content,
              image: post.image_url,
              images: post.image_urls,
              likes: post.likes_count || 0,
              comments: post.comments_count || 0,
              shares: post.shares_count || 0,
              timestamp: formatTimestamp(post.created_at),
            };
          }) || [];

        setBookmarkedPosts(transformedPosts);
      } catch (err) {
        console.error('Error fetching bookmarked posts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBookmarkedPosts();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Saved Posts</h1>
            <p className="text-gray-600">
              {bookmarkedPosts.length} {bookmarkedPosts.length === 1 ? 'post' : 'posts'} saved
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading saved posts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && bookmarkedPosts.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No saved posts yet</h3>
            <p className="text-gray-600 mb-6">
              Posts you bookmark will appear here. Start exploring and save posts you want to read later!
            </p>
            <button
              onClick={() => navigate('/feed')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-shadow"
            >
              Explore Feed
            </button>
          </div>
        )}

        {/* Bookmarked Posts */}
        {!loading && bookmarkedPosts.length > 0 && (
          <div className="space-y-4">
            {bookmarkedPosts.map((post) => (
              <Post key={post.id} {...post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
