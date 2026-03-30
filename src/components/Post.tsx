import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Loader2, BadgeCheck, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { PostComments } from './PostComments';
import { Sheet, SheetContent } from './ui/sheet';
import { ImageGrid } from './ImageGrid';
import { ImageLightbox } from './ImageLightbox';
import { Play } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// YouTube player: shows thumbnail, click to play video
// Only one video plays at a time across all Post instances
function YouTubePlayer({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  const playerIdRef = useRef(`yt-${videoId}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.playerId !== playerIdRef.current) {
        setPlaying(false);
      }
    };
    window.addEventListener('video-play', handler);
    return () => window.removeEventListener('video-play', handler);
  }, []);

  const handlePlay = () => {
    window.dispatchEvent(new CustomEvent('video-play', { detail: { playerId: playerIdRef.current } }));
    setPlaying(true);
  };

  if (playing) {
    return (
      <div className="w-full">
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="YouTube video"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full cursor-pointer relative group"
      onClick={handlePlay}
    >
      <img
        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
        alt="Video thumbnail"
        className="w-full object-cover"
        style={{ aspectRatio: '16/9' }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
        </div>
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-red-500"><path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8z"/><path d="M9.5 15.5V8.5l6.5 3.5-6.5 3.5z" fill="white"/></svg>
        YouTube
      </div>
    </div>
  );
}

// Render text with clickable links and **bold** markdown
function RichText({ text }: { text: string }) {
  // Split by URLs and **bold** markers
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const boldRegex = /\*\*(.+?)\*\*/g;

  // First pass: split by URLs
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        // Check if this part is a URL
        if (urlRegex.test(part)) {
          urlRegex.lastIndex = 0; // Reset regex state
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part.length > 60 ? part.substring(0, 57) + '...' : part}
            </a>
          );
        }
        // For non-URL parts, process **bold** markers
        const boldParts = part.split(boldRegex);
        return boldParts.map((bp, j) => {
          // Odd indices are the captured groups (bold text)
          if (j % 2 === 1) {
            return <strong key={`${i}-${j}`}>{bp}</strong>;
          }
          return <span key={`${i}-${j}`}>{bp}</span>;
        });
      })}
    </>
  );
}

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
  onDelete?: () => void;
}

export function Post({ id, author, content, image, images, images_count, likes, comments, shares, timestamp, onDelete }: PostProps) {
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

  // Reading tracker: award 40 pts after 15s of viewing
  const postRef = useRef<HTMLDivElement>(null);
  const readTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readAwardedRef = useRef(false);

  useEffect(() => {
    if (!user || readAwardedRef.current) return;
    const el = postRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !readAwardedRef.current) {
          // Start 15s timer when post is visible
          if (!readTimerRef.current) {
            readTimerRef.current = setTimeout(async () => {
              readTimerRef.current = null;
              if (readAwardedRef.current) return;
              try {
                console.log(`📖 Awarding reading points for post ${id}...`);
                const { data, error } = await supabase.rpc('award_reading_points', {
                  p_user_id: user.id,
                  p_post_id: String(id),
                  p_duration_seconds: 15,
                });
                if (error) {
                  console.error('Reading points RPC error:', error);
                  return;
                }
                console.log('📖 Reading points result:', data);
                if (data?.success) {
                  readAwardedRef.current = true;
                  toast.success(`+${data.points} pts for reading`, { duration: 2000 });
                } else {
                  // Mark as awarded for non-retryable reasons (already_read, daily_limit, earning_locked)
                  if (data?.reason && data.reason !== 'error') {
                    readAwardedRef.current = true;
                  }
                }
              } catch (err) {
                console.error('Reading points error:', err);
              }
            }, 15000);
          }
        } else if (!entry.isIntersecting && readTimerRef.current) {
          clearTimeout(readTimerRef.current);
          readTimerRef.current = null;
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
    };
  }, [user, id]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [postAuthorId, setPostAuthorId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkIfLiked();
      fetchPostAuthor();
    }
  }, [user, id]);

  const fetchPostAuthor = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPostAuthorId(data.user_id);
    } catch (err) {
      console.error('Error fetching post author:', err);
    }
  };

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

  const handleDelete = async () => {
    if (!user || !postAuthorId) {
      toast.error('Unable to delete post');
      return;
    }

    // Check if user owns this post
    if (user.id !== postAuthorId) {
      toast.error('You can only delete your own posts');
      return;
    }

    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);

      // Delete the post (cascade will delete likes, comments, and images)
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Extra security check

      if (error) throw error;

      toast.success('Post deleted successfully');

      // Call parent onDelete callback to remove from feed
      if (onDelete) {
        onDelete();
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast.error(err.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  // Determine which images to display
  const displayImages = images && images.length > 0 ? images : (image ? [{ url: image }] : []);

  // Detect YouTube URLs in content
  const youtubeEmbed = useMemo(() => {
    if (!content) return null;
    // Match youtube.com/watch, youtube.com/shorts, youtu.be links
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})(?:[&?\S]*)?/i;
    const match = content.match(ytRegex);
    if (!match) return null;

    const videoId = match[1];
    const fullUrl = match[0];
    const isShort = /shorts\//.test(fullUrl);

    // Remove the YouTube URL and any "Watch:" prefix from displayed content
    let cleanContent = content
      .replace(/▶️\s*Watch:\s*/g, '')
      .replace(fullUrl, '')
      .replace(/\*\*/g, '') // remove markdown bold markers
      .trim();

    // Remove trailing source line if present
    cleanContent = cleanContent.replace(/📌\s*Source:.*$/m, '').trim();
    // Remove "Read more:" leftover
    cleanContent = cleanContent.replace(/🔗\s*Read more:\s*/g, '').trim();
    // Clean up multiple newlines
    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n').trim();

    return { videoId, isShort, cleanContent };
  }, [content]);

  return (
    <div ref={postRef} className="bg-white rounded-lg border border-gray-200">
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
        {/* Show dropdown menu only if user owns the post */}
        {user && postAuthorId === user.id ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Post'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        )}
      </div>

      {/* Post Content - hide text for YouTube-only posts */}
      {(!youtubeEmbed || youtubeEmbed.cleanContent.length > 0) && (
        <div className="px-3 sm:px-4 pb-2 sm:pb-3">
          <p className="whitespace-pre-wrap text-sm sm:text-base">
            <RichText text={youtubeEmbed ? youtubeEmbed.cleanContent : content} />
          </p>
        </div>
      )}

      {/* YouTube Video Player */}
      {youtubeEmbed && (
        <YouTubePlayer videoId={youtubeEmbed.videoId} />
      )}

      {/* Post Images (hide if YouTube embed already shows the thumbnail) */}
      {!youtubeEmbed && displayImages.length > 0 && (
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
