import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, MoreVertical, Volume2, VolumeX, User, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ReelComments } from './ReelComments';
import { Sheet, SheetContent } from './ui/sheet';

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

interface ReelsViewerProps {
  initialReelId?: string;
  openComments?: boolean;
  onClose?: () => void;
}

export function ReelsViewer({ initialReelId, openComments = false, onClose }: ReelsViewerProps) {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [showComments, setShowComments] = useState(openComments);
  const [isLiking, setIsLiking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [viewTracked, setViewTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReels();
  }, []);

  useEffect(() => {
    // Auto-play current video and pause others
    const currentReel = reels[currentIndex];
    if (currentReel) {
      const currentVideo = videoRefs.current.get(currentReel.reel_id);
      if (currentVideo) {
        currentVideo.play().catch(err => console.log('Autoplay failed:', err));

        // Track view after 3 seconds
        setTimeout(() => {
          if (!viewTracked.has(currentReel.reel_id)) {
            trackView(currentReel.reel_id);
            setViewTracked(prev => new Set(prev).add(currentReel.reel_id));
          }
        }, 3000);
      }

      // Pause other videos
      videoRefs.current.forEach((video, reelId) => {
        if (reelId !== currentReel.reel_id) {
          video.pause();
        }
      });
    }
  }, [currentIndex, reels]);

  const fetchReels = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_reels_feed', {
        p_user_id: user?.id || null,
        p_limit: 20,
        p_offset: 0
      });

      if (error) throw error;

      setReels(data || []);
    } catch (err: any) {
      console.error('Error fetching reels:', err);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (reelId: string) => {
    try {
      await supabase.from('reel_views').insert({
        reel_id: reelId,
        user_id: user?.id || null
      });

      // Update local view count
      setReels(prev => prev.map(reel =>
        reel.reel_id === reelId
          ? { ...reel, views_count: reel.views_count + 1 }
          : reel
      ));
    } catch (err) {
      // Silently fail - view might already be tracked
      console.log('View tracking:', err);
    }
  };

  const toggleLike = async (reel: Reel) => {
    if (!user) {
      toast.error('Please log in to like reels');
      return;
    }

    if (isLiking) return;

    try {
      setIsLiking(true);

      if (reel.is_liked) {
        // Unlike
        const { error } = await supabase
          .from('reel_likes')
          .delete()
          .eq('reel_id', reel.reel_id)
          .eq('user_id', user.id);

        if (error) throw error;

        setReels(prev => prev.map(r =>
          r.reel_id === reel.reel_id
            ? { ...r, is_liked: false, likes_count: Math.max(0, r.likes_count - 1) }
            : r
        ));
        toast.success('Reel unliked');
      } else {
        // Like
        const { error } = await supabase.from('reel_likes').insert({
          reel_id: reel.reel_id,
          user_id: user.id
        });

        if (error) throw error;

        setReels(prev => prev.map(r =>
          r.reel_id === reel.reel_id
            ? { ...r, is_liked: true, likes_count: r.likes_count + 1 }
            : r
        ));
        toast.success('Reel liked');
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleScroll = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    if (e.deltaY > 0 && currentIndex < reels.length - 1) {
      // Scroll down - next reel
      setCurrentIndex(prev => prev + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      // Scroll up - previous reel
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, reels.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentIndex < reels.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
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
    if (touchStart - touchEnd > 75) {
      // Swipe up - next reel
      if (currentIndex < reels.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    }

    if (touchStart - touchEnd < -75) {
      // Swipe down - previous reel
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const handleShare = async (reel: Reel) => {
    const shareData = {
      title: `Check out this reel by ${reel.full_name}`,
      text: reel.caption,
      url: window.location.href
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
      >
        {/* Video Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={el => {
              if (el && currentReel) {
                videoRefs.current.set(currentReel.reel_id, el);
              }
            }}
            src={currentReel.video_url}
            muted={muted}
            playsInline
            className="w-full h-full object-contain"
            onClick={(e) => {
              const video = e.currentTarget;
              if (video.paused) {
                video.play();
              } else {
                video.pause();
              }
            }}
            onEnded={() => {
              // Auto-advance to next reel when current video ends
              if (currentIndex < reels.length - 1) {
                setCurrentIndex(prev => prev + 1);
              } else {
                // If we're on the last reel, loop back to the first one
                setCurrentIndex(0);
              }
            }}
          />

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">Reels</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:text-red-400 hover:bg-white/20 transition-colors text-2xl font-bold h-10 w-10 p-0 rounded-full"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* User Info & Caption */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                {/* User Info */}
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="w-10 h-10 border-2 border-white">
                    <AvatarImage src={currentReel.avatar_url} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-semibold">
                      {currentReel.full_name}
                    </p>
                    <p className="text-white/70 text-sm">
                      @{currentReel.username}
                    </p>
                  </div>
                </div>

                {/* Caption */}
                <p className="text-white text-sm mb-2">
                  {currentReel.caption}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-white/70 text-xs">
                  <span>{formatCount(currentReel.views_count)} views</span>
                  <span>•</span>
                  <span>{formatCount(currentReel.likes_count)} likes</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4">
                {/* Like Button */}
                <button
                  onClick={() => toggleLike(currentReel)}
                  disabled={isLiking}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`p-3 rounded-full ${
                    currentReel.is_liked
                      ? 'bg-red-500'
                      : 'bg-white/20 backdrop-blur-sm'
                  }`}>
                    {isLiking ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Heart
                        className={`w-6 h-6 ${
                          currentReel.is_liked
                            ? 'text-white fill-white'
                            : 'text-white'
                        }`}
                      />
                    )}
                  </div>
                  <span className="text-white text-xs font-medium">
                    {formatCount(currentReel.likes_count)}
                  </span>
                </button>

                {/* Comment Button */}
                <button
                  onClick={() => setShowComments(true)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">
                    {formatCount(currentReel.comments_count)}
                  </span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => handleShare(currentReel)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                </button>

                {/* Mute Button */}
                <button
                  onClick={() => setMuted(!muted)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    {muted ? (
                      <VolumeX className="w-6 h-6 text-white" />
                    ) : (
                      <Volume2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
            {reels.map((_, index) => (
              <div
                key={index}
                className={`w-1 h-8 rounded-full ${
                  index === currentIndex
                    ? 'bg-white'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Comments Sheet */}
      <Sheet open={showComments} onOpenChange={setShowComments}>
        <SheetContent side="bottom" className="h-[70vh]">
          <ReelComments
            reelId={currentReel.reel_id}
            onClose={() => setShowComments(false)}
            onCommentAdded={() => {
              setReels(prev => prev.map(reel =>
                reel.reel_id === currentReel.reel_id
                  ? { ...reel, comments_count: reel.comments_count + 1 }
                  : reel
              ));
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
