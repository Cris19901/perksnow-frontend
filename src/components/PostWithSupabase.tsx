/**
 * Example: Post Component with Real Supabase Integration
 *
 * This is an updated version of Post.tsx that works with real Supabase data.
 * You can replace the original Post.tsx with this code, or use it as a reference.
 */

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '@/contexts/AuthContext';
import { likePost, unlikePost } from '@/lib/api-examples';
import { supabase } from '@/lib/supabase';

interface PostWithSupabaseProps {
  // Data from Supabase
  id: string; // UUID from database
  user_id: string;
  content: string;
  image_url?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  // User data from join
  users: {
    id: string;
    username: string;
    full_name?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
  // Optional: refetch callback
  onUpdate?: () => void;
}

export function PostWithSupabase({
  id,
  user_id,
  content,
  image_url,
  likes_count,
  comments_count,
  shares_count,
  created_at,
  users,
  onUpdate,
}: PostWithSupabaseProps) {
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes_count);
  const [loading, setLoading] = useState(false);

  // Check if current user has liked this post
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentUser) return;

      try {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('post_id', id)
          .maybeSingle();

        if (!error && data) {
          setIsLiked(true);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkIfLiked();
  }, [currentUser, id]);

  const handleLike = async () => {
    if (!currentUser) {
      alert('Please sign in to like posts');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      if (isLiked) {
        // Unlike the post
        await unlikePost(currentUser.id, id);
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        // Like the post
        await likePost(currentUser.id, id);
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }

      // Optional: call parent to refetch data
      onUpdate?.();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      // Revert optimistic update
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);

      // Check if error is due to duplicate like
      if (error.code === '23505') {
        setIsLiked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
            <AvatarImage src={users.avatar_url || undefined} />
            <AvatarFallback>
              {users.full_name?.[0] || users.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm sm:text-base font-medium">
                {users.full_name || users.username}
              </p>
              {users.is_verified && (
                <span className="text-blue-500 text-xs">✓</span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">
              @{users.username} · {formatTimestamp(created_at)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
          <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3">
        <p className="whitespace-pre-wrap text-sm sm:text-base">{content}</p>
      </div>

      {/* Post Image */}
      {image_url && (
        <div className="w-full">
          <ImageWithFallback
            src={image_url}
            alt="Post image"
            className="w-full object-cover max-h-[600px]"
          />
        </div>
      )}

      {/* Post Stats */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
              <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white fill-white" />
            </div>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 ml-1">{likeCount}</span>
        </div>
        <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
          <span className="hidden sm:inline">{comments_count} comments</span>
          <span className="sm:hidden">{comments_count}</span>
          <span className="hidden sm:inline">{shares_count} shares</span>
          <span className="sm:hidden">{shares_count}</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-around px-2 sm:px-4 py-1.5 sm:py-2">
        <Button
          variant="ghost"
          className={`flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm ${
            isLiked ? 'text-pink-600' : ''
          }`}
          onClick={handleLike}
          disabled={loading}
        >
          <Heart
            className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-pink-600' : ''}`}
          />
          <span>{loading ? '...' : 'Like'}</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">Comment</span>
        </Button>
        <Button variant="ghost" className="flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Share</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 sm:h-9 sm:w-9 ${isSaved ? 'text-blue-600' : ''}`}
          onClick={() => setIsSaved(!isSaved)}
        >
          <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isSaved ? 'fill-blue-600' : ''}`} />
        </Button>
      </div>
    </div>
  );
}

/**
 * Usage Example:
 *
 * import { usePosts } from '@/hooks/useSupabase';
 * import { PostWithSupabase } from './PostWithSupabase';
 *
 * function Feed() {
 *   const { posts, loading, refetch } = usePosts();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       {posts.map((post) => (
 *         <PostWithSupabase
 *           key={post.id}
 *           {...post}
 *           onUpdate={refetch}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 */
