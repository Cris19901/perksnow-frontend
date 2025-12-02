import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../Header';
import { Post } from '../Post';
import { supabase } from '@/lib/supabase';
import { Hash, TrendingUp } from 'lucide-react';

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

interface HashtagPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

export function HashtagPage({ onCartClick, cartItemsCount }: HashtagPageProps) {
  const { hashtag } = useParams<{ hashtag: string }>();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<any[]>([]);
  const [hashtagInfo, setHashtagInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHashtagPosts() {
      if (!hashtag) return;

      try {
        setLoading(true);

        // Fetch hashtag info
        const { data: hashtagData } = await supabase
          .from('hashtags')
          .select('*')
          .eq('name', hashtag.toLowerCase())
          .single();

        setHashtagInfo(hashtagData);

        // Fetch posts with this hashtag
        const { data: postHashtagsData, error } = await supabase
          .from('post_hashtags')
          .select(`
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
          .eq('hashtag_id', hashtagData?.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform posts data
        const transformedPosts = postHashtagsData
          ?.filter((item: any) => item.posts) // Filter out null posts
          .map((item: any) => {
            const post = item.posts;
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

        setPosts(transformedPosts);
      } catch (err) {
        console.error('Error fetching hashtag posts:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchHashtagPosts();
  }, [hashtag]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onNavigate={(page) => navigate(`/${page}`)}
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Hashtag Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <Hash className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">#{hashtag}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  <span>{hashtagInfo?.post_count || posts.length} posts</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No posts found</h3>
            <p className="text-gray-600 mb-6">
              Be the first to post with #{hashtag}!
            </p>
            <button
              onClick={() => navigate('/feed')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-shadow"
            >
              Create a Post
            </button>
          </div>
        )}

        {/* Posts */}
        {!loading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <Post key={post.id} {...post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
