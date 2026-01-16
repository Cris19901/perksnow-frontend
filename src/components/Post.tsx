import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Loader2, BadgeCheck } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PostComments } from './PostComments';
import { Sheet, SheetContent } from './ui/sheet';
import { ImageGrid } from './ImageGrid';
import { ImageLightbox } from './ImageLightbox';

interface PostProps {
  id: number;
  author: {
    name: string;
    username: string;
    avatar: string;
    isVerified?: boolean;
  };
  content: string;
  image?: string;
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
  images_count?: number;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
}

export function Post({ id, author, content, image, images, images_count, likes, comments, shares, timestamp }: PostProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(comments);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (user) {
      checkIfLiked();
    }
  }, [user, id]);

  const checkIfLiked = async () => {
    if (!user) {
      setIsLiked(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows found

      if (error) {
        console.error('Error checking like status:', error);
        return;
      }

      setIsLiked(!!data);
    } catch (err) {
      console.error('Error checking if post is liked:', err);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    if (isLiking) return;

    try {
      setIsLiking(true);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
        toast.success('Post unliked');
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: id,
            user_id: user.id
          });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount(prev => prev + 1);
        toast.success('Post liked');
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Post by ${author.name}`,
      text: content,
      url: `${window.location.origin}/post/${id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success('Shared successfully');
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (err: any) {
      // User cancelled share or clipboard access denied
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
        toast.error('Failed to share');
      }
    }
  };

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  // Determine which images to display
  const displayImages = images && images.length > 0 ? images : (image ? [{ url: image }] : []);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/profile/${author.username.replace('@', '')}`)}
        >
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <p className="text-sm sm:text-base font-semibold">{author.name}</p>
              {author.isVerified && (
                <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" title="Verified Pro User" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500">{timestamp}</p>
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

      {/* Post Images */}
      {displayImages.length > 0 && (
        <div className="w-full">
          {displayImages.length === 1 ? (
            // Single image - full width
            <div className="cursor-pointer" onClick={() => handleImageClick(0)}>
              <ImageWithFallback
                src={displayImages[0].url}
                alt={displayImages[0].alt || "Post image"}
                className="w-full object-cover max-h-[600px]"
              />
            </div>
          ) : (
            // 2+ images - use Instagram-style grid layout
            <ImageGrid
              images={displayImages}
              onImageClick={handleImageClick}
            />
          )}
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
          <span className="hidden sm:inline">{commentCount} comments</span>
          <span className="sm:hidden">{commentCount}</span>
          <span className="hidden sm:inline">{shares} shares</span>
          <span className="sm:hidden">{shares}</span>
        </div>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-around px-2 sm:px-4 py-1.5 sm:py-2">
        <Button
          variant="ghost"
          className={`flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm ${isLiked ? 'text-pink-600' : ''}`}
          onClick={handleLike}
          disabled={isLiking}
        >
          {isLiking ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-pink-600' : ''}`} />
          )}
          <span>Like</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
          onClick={() => setShowComments(true)}
        >
          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden xs:inline">Comment</span>
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-1 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm"
          onClick={handleShare}
        >
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

      {/* Comments Sheet */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <PostComments
            postId={id.toString()}
            onClose={() => setShowComments(false)}
            onCommentAdded={() => setCommentCount(prev => prev + 1)}
          />
        </SheetContent>
      </Sheet>

      {/* Image Lightbox */}
      {showLightbox && displayImages.length > 0 && (
        <ImageLightbox
          images={displayImages}
          initialIndex={lightboxIndex}
          postId={id}
          postAuthor={{
            name: author.name,
            username: author.username,
            avatar: author.avatar,
          }}
          isLiked={isLiked}
          onClose={() => setShowLightbox(false)}
          onLike={handleLike}
        />
      )}
    </div>
  );
}
