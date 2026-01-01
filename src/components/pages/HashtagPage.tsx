import { Header } from '../Header';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Post } from '../Post';
import { TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface HashtagPageProps {
  onCartClick?: () => void;
  cartItemsCount?: number;
}

interface PostData {
  id: string;
  content: string;
  image_url: string | null;
  video_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_liked: boolean;
}

export function HashtagPage({ onCartClick, cartItemsCount }: HashtagPageProps) {
  const { hashtag } = useParams<{ hashtag: string }>();
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsCount, setPostsCount] = useState(0);

  useEffect(() => {
    if (hashtag) {
      fetchHashtagPosts();
    }
  }, [hashtag, user]);

  const fetchHashtagPosts = async () => {
    try {
      setLoading(true);

      // Search for posts containing the hashtag
      const searchTerm = `%${hashtag}%`;

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          image_url,
          video_url,
          likes_count,
          comments_count,
          shares_count,
          created_at,
          user_id,
          users!inner(username, full_name, avatar_url)
        `)
        .ilike('content', searchTerm)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform data and check if user liked each post
      const postsWithUserData = await Promise.all(
        (data || []).map(async (post: any) => {
          // Check if user liked this post
          let isLiked = false;
          if (user) {
            const { data: likeData } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', user.id)
              .single();
            isLiked = !!likeData;
          }

          return {
            id: post.id,
            content: post.content,
            image_url: post.image_url,
            video_url: post.video_url,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
            shares_count: post.shares_count || 0,
            created_at: post.created_at,
            user_id: post.user_id,
            username: post.users.username,
            full_name: post.users.full_name,
            avatar_url: post.users.avatar_url,
            is_liked: isLiked
          };
        })
      );

      setPosts(postsWithUserData);
      setPostsCount(postsWithUserData.length);
    } catch (err) {
      console.error('Error fetching hashtag posts:', err);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!hashtag) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          onCartClick={onCartClick}
          cartItemsCount={cartItemsCount}
          currentPage="feed"
        />
        <div className="max-w-[600px] mx-auto px-4 py-4 sm:py-6">
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Hashtag not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        onCartClick={onCartClick}
        cartItemsCount={cartItemsCount}
        currentPage="feed"
      />

      <div className="max-w-[600px] mx-auto px-4 py-4 sm:py-6">
        {/* Hashtag Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-blue-600 mb-1">#{hashtag}</h1>
              <p className="text-gray-600">
                {loading ? (
                  'Loading...'
                ) : (
                  `${formatCount(postsCount)} ${postsCount === 1 ? 'post' : 'posts'}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-semibold text-gray-900 mb-2">No posts found</h3>
              <p className="text-gray-500 text-sm">
                Be the first to post with #{hashtag}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <Post
                key={post.id}
                id={post.id}
                user={{
                  id: post.user_id,
                  name: post.full_name || post.username,
                  username: post.username,
                  avatar: post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`
                }}
                content={post.content}
                image={post.image_url}
                video={post.video_url}
                likes={post.likes_count}
                comments={post.comments_count}
                shares={post.shares_count}
                timestamp={new Date(post.created_at).toLocaleDateString()}
                initialLiked={post.is_liked}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
