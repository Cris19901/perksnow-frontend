import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Play, Eye, Heart, MessageCircle, Share2, Maximize2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ReelPostProps {
  reel_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  video_url: string;
  thumbnail_url: string;
  caption: string;
  duration: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
  onReelClick?: (reelId: string, showComments?: boolean) => void;
  onLikeUpdate?: (reelId: string, liked: boolean, newCount: number) => void;
}

export function ReelPost({
  reel_id,
  username,
  full_name,
  avatar_url,
  thumbnail_url,
  caption,
  duration,
  views_count,
  likes_count,
  comments_count,
  created_at,
  is_liked = false,
  onReelClick,
  onLikeUpdate,
}: ReelPostProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(is_liked);
  const [currentLikesCount, setCurrentLikesCount] = useState(likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening reel viewer

    if (!user) {
      toast.error('Please log in to like reels');
      return;
    }

    if (isLiking) return;

    try {
      setIsLiking(true);

      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reel_id)
          .eq('user_id', user.id);

        if (error) throw error;

        const newCount = Math.max(0, currentLikesCount - 1);
        setLiked(false);
        setCurrentLikesCount(newCount);
        onLikeUpdate?.(reel_id, false, newCount);
        toast.success('Unliked');
      } else {
        // Like
        const { error } = await supabase
          .from('reel_likes')
          .insert({ reel_id, user_id: user.id });

        if (error) throw error;

        const newCount = currentLikesCount + 1;
        setLiked(true);
        setCurrentLikesCount(newCount);
        onLikeUpdate?.(reel_id, true, newCount);
        toast.success('Liked!');
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open reel viewer with comments open
    onReelClick?.(reel_id, true);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const shareData = {
      title: `Check out this reel by ${full_name}`,
      text: caption,
      url: `${window.location.origin}/reels?id=${reel_id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${username}`);
          }}
        >
          <Avatar>
            <AvatarImage src={avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
            <AvatarFallback>{(full_name || username)[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold hover:underline">{full_name || username}</p>
            <p className="text-sm text-gray-500">@{username} • {getTimeAgo(created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full">
          <Play className="w-3 h-3 text-purple-600" />
          <span className="text-xs font-medium text-purple-700">Reel</span>
        </div>
      </div>

      {/* Reel Content */}
      <div
        onClick={() => onReelClick?.(reel_id)}
        className="relative aspect-[9/16] max-h-[600px] bg-gray-900 cursor-pointer group"
      >
        {/* Thumbnail */}
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={caption}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
            <Play className="w-16 h-16 text-white opacity-50" />
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-12 h-12 text-purple-600" fill="currentColor" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-white text-sm font-medium">
          {duration}s
        </div>

        {/* Expand Button */}
        <div className="absolute bottom-3 right-3 bg-black/70 hover:bg-black/90 p-2 rounded-full transition-colors">
          <Maximize2 className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-4 pt-3">
          <p className="text-gray-900">{caption}</p>
        </div>
      )}

      {/* Stats & Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Views */}
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              {formatCount(views_count)}
            </span>

            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                liked
                  ? 'text-red-500 hover:text-red-600'
                  : 'text-gray-600 hover:text-red-500'
              }`}
            >
              {isLiking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              )}
              {formatCount(currentLikesCount)}
            </button>

            {/* Comment Button */}
            <button
              onClick={handleComment}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {formatCount(comments_count)}
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
