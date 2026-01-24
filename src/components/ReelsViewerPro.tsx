import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ReelComments } from './ReelComments';
import { Sheet, SheetContent } from './ui/sheet';
import { ReelPlayerPro } from './ReelPlayerPro';

interface Reel {
  reel_id: string;
  user_id: string;
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
  is_liked: boolean;
}

interface ReelsViewerProProps {
  initialReelId?: string;
  openComments?: boolean;
  onClose?: () => void;
}

export function ReelsViewerPro({ initialReelId, openComments = false, onClose }: ReelsViewerProProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(openComments);
  const [isLiking, setIsLiking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewTracked, setViewTracked] = useState<Set<string>>(new Set());
  const isTransitioning = useRef(false);
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('reels')
        .select(`
          reel_id:id,
          user_id,
          video_url,
          thumbnail_url,
          caption,
          duration,
          views_count,
          likes_count,
          comments_count,
          created_at,
          user:users!reels_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const formattedReels = data.map((reel: any) => ({
        reel_id: reel.reel_id,
        user_id: reel.user_id,
        username: reel.user.username,
        full_name: reel.user.full_name,
        avatar_url: reel.user.avatar_url,
        video_url: reel.video_url,
        thumbnail_url: reel.thumbnail_url,
        caption: reel.caption,
        duration: reel.duration,
        views_count: reel.views_count || 0,
        likes_count: reel.likes_count || 0,
        comments_count: reel.comments_count || 0,
        created_at: reel.created_at,
        is_liked: false,
      }));

      setReels(formattedReels);

      // If initialReelId provided, find its index
      if (initialReelId) {
        const index = formattedReels.findIndex((r: Reel) => r.reel_id === initialReelId);
        if (index !== -1) {
          setCurrentIndex(index);
        }
      }

      // Check which reels are liked by current user
      if (user) {
        const { data: likes } = await supabase
          .from('reel_likes')
          .select('reel_id')
          .eq('user_id', user.id);

        if (likes) {
          const likedIds = new Set(likes.map(l => l.reel_id));
          setReels(prev =>
            prev.map(r => ({
              ...r,
              is_liked: likedIds.has(r.reel_id),
            }))
          );
        }
      }
    } catch (error: any) {
      console.error('Error fetching reels:', error);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (reelId: string) => {
    if (!user) return;

    try {
      await supabase.from('reel_views').insert({
        reel_id: reelId,
        user_id: user.id,
      });

      // Update local count
      setReels(prev =>
        prev.map(r =>
          r.reel_id === reelId ? { ...r, views_count: r.views_count + 1 } : r
        )
      );
    } catch (error: any) {
      console.error('Error tracking view:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like reels');
      return;
    }

    if (isLiking) return;

    const currentReel = reels[currentIndex];
    const wasLiked = currentReel.is_liked;

    try {
      setIsLiking(true);

      // Optimistic update
      setReels(prev =>
        prev.map(r =>
          r.reel_id === currentReel.reel_id
            ? {
                ...r,
                is_liked: !wasLiked,
                likes_count: wasLiked ? r.likes_count - 1 : r.likes_count + 1,
              }
            : r
        )
      );

      if (wasLiked) {
        await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', currentReel.reel_id)
          .eq('user_id', user.id);
      } else {
        await supabase.from('reel_likes').insert({
          reel_id: currentReel.reel_id,
          user_id: user.id,
        });
      }
    } catch (error: any) {
      console.error('Error liking reel:', error);
      toast.error('Failed to like reel');

      // Revert on error
      setReels(prev =>
        prev.map(r =>
          r.reel_id === currentReel.reel_id
            ? {
                ...r,
                is_liked: wasLiked,
                likes_count: wasLiked ? r.likes_count + 1 : r.likes_count - 1,
              }
            : r
        )
      );
    } finally {
      setIsLiking(false);
    }
  };

  const handleScroll = useCallback(
    (e: React.WheelEvent) => {
      if (isTransitioning.current) return;

      const delta = e.deltaY;

      if (delta > 0 && currentIndex < reels.length - 1) {
        isTransitioning.current = true;
        setCurrentIndex(prev => prev + 1);
        setTimeout(() => {
          isTransitioning.current = false;
        }, 600);
      } else if (delta < 0 && currentIndex > 0) {
        isTransitioning.current = true;
        setCurrentIndex(prev => prev - 1);
        setTimeout(() => {
          isTransitioning.current = false;
        }, 600);
      }
    },
    [currentIndex, reels.length]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning.current) return;

      if (e.key === 'ArrowDown' && currentIndex < reels.length - 1) {
        isTransitioning.current = true;
        setCurrentIndex(prev => prev + 1);
        setTimeout(() => {
          isTransitioning.current = false;
        }, 600);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        isTransitioning.current = true;
        setCurrentIndex(prev => prev - 1);
        setTimeout(() => {
          isTransitioning.current = false;
        }, 600);
      } else if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reels.length, onClose]);

  // Handle touch swipe for mobile
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (isTransitioning.current) return;

    const swipeDistance = touchStart - touchEnd;

    if (swipeDistance > 75 && currentIndex < reels.length - 1) {
      isTransitioning.current = true;
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 600);
    } else if (swipeDistance < -75 && currentIndex > 0) {
      isTransitioning.current = true;
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => {
        isTransitioning.current = false;
      }, 600);
    }
  };

  const handleShare = async (reel: Reel) => {
    const shareData = {
      title: `Check out this reel by ${reel.full_name}`,
      text: reel.caption,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.log('Share failed:', err);
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Track view after 3 seconds of watching
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    const currentReel = reels[currentIndex];
    if (currentTime >= 3 && !viewTracked.has(currentReel.reel_id)) {
      trackView(currentReel.reel_id);
      setViewTracked(prev => new Set(prev).add(currentReel.reel_id));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading reels...</p>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-center p-6">
          <p className="text-xl mb-4">No reels available</p>
          <Button onClick={onClose} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <>
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed inset-0 bg-black z-50 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video Player */}
        <div className="relative w-full h-full flex items-center justify-center">
          <ReelPlayerPro
            key={currentReel.reel_id}
            videoUrl={currentReel.video_url}
            muted={muted}
            autoplay={true}
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full"
          />

          {/* Overlay Content */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top Header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <h1 className="text-white text-xl font-bold">Reels</h1>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              {/* User Info */}
              <div
                className="flex items-center gap-3 mb-3 cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${currentReel.username}`);
                }}
              >
                <Avatar className="w-10 h-10 border-2 border-white">
                  <AvatarImage src={currentReel.avatar_url} />
                  <AvatarFallback>{currentReel.full_name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-white font-semibold hover:underline">
                    {currentReel.full_name}
                  </p>
                  <p className="text-white/80 text-sm hover:underline">@{currentReel.username}</p>
                </div>
              </div>

              {/* Caption */}
              <p className="text-white text-sm mb-3 line-clamp-2">{currentReel.caption}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-white/90 text-sm">
                <span>{formatCount(currentReel.views_count)} views</span>
                <span>•</span>
                <span>{formatCount(currentReel.likes_count)} likes</span>
              </div>
            </div>

            {/* Action Buttons - Right Side */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 pointer-events-auto">
              {/* Like Button */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <div
                  className={`rounded-full p-3 ${
                    currentReel.is_liked
                      ? 'bg-purple-600'
                      : 'bg-black/40 hover:bg-black/60'
                  }`}
                >
                  <Heart
                    className={`w-6 h-6 ${
                      currentReel.is_liked ? 'fill-white text-white' : 'text-white'
                    }`}
                  />
                </div>
                <span className="text-white text-xs font-semibold">
                  {formatCount(currentReel.likes_count)}
                </span>
              </button>

              {/* Comment Button */}
              <button
                onClick={() => setShowComments(true)}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <div className="rounded-full p-3 bg-black/40 hover:bg-black/60">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-semibold">
                  {formatCount(currentReel.comments_count)}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={() => handleShare(currentReel)}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <div className="rounded-full p-3 bg-black/40 hover:bg-black/60">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs font-semibold">Share</span>
              </button>

              {/* Mute Toggle */}
              <button
                onClick={() => setMuted(!muted)}
                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
              >
                <div className="rounded-full p-3 bg-black/40 hover:bg-black/60">
                  {muted ? (
                    <VolumeX className="w-6 h-6 text-white" />
                  ) : (
                    <Volume2 className="w-6 h-6 text-white" />
                  )}
                </div>
              </button>
            </div>

            {/* Progress Indicators - Right Side */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {reels.map((_, index) => (
                <div
                  key={index}
                  className={`w-1 rounded-full transition-all ${
                    index === currentIndex
                      ? 'h-8 bg-white'
                      : index < currentIndex
                      ? 'h-4 bg-white/60'
                      : 'h-4 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comments Sheet */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <ReelComments
            reelId={currentReel.reel_id}
            onClose={() => setShowComments(false)}
            onCommentAdded={() => {
              setReels(prev =>
                prev.map(r =>
                  r.reel_id === currentReel.reel_id
                    ? { ...r, comments_count: r.comments_count + 1 }
                    : r
                )
              );
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
