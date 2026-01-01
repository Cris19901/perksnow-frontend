import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, User, Plus, Send, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { StoryUpload } from './StoryUpload';
import { toast } from 'sonner';

interface Story {
  story_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  duration: number;
  created_at: string;
  expires_at: string;
  views_count: number;
  is_viewed: boolean;
}

interface StoryGroup {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  stories: Story[];
}

interface StoryViewerProps {
  userId: string;
  onClose: () => void;
}

export function StoryViewer({ userId, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [storyGroup, setStoryGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReply, setShowReply] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackedViewsRef = useRef<Set<string>>(new Set());
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartYRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserStories();
  }, [userId]);

  useEffect(() => {
    if (storyGroup && storyGroup.stories.length > 0) {
      startStoryProgress();
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStoryIndex, isPaused, storyGroup]);

  const fetchUserStories = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_user_stories', {
        p_user_id: userId,
        p_viewer_id: user?.id || null
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        onClose();
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      setStoryGroup({
        user_id: userId,
        username: userData.username,
        full_name: userData.full_name,
        avatar_url: userData.avatar_url,
        stories: data
      });

    } catch (err: any) {
      console.error('Error fetching stories:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const startStoryProgress = () => {
    if (!storyGroup || isPaused) return;

    const currentStory = storyGroup.stories[currentStoryIndex];
    if (!currentStory) return;

    setProgress(0);

    if (!trackedViewsRef.current.has(currentStory.story_id)) {
      setTimeout(() => {
        trackView(currentStory.story_id);
      }, 1000);
    }

    if (currentStory.media_type === 'video') {
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
      }
    } else {
      const duration = currentStory.duration * 1000;
      const interval = 50;
      const increment = (interval / duration) * 100;

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            nextStory();
            return 0;
          }
          return prev + increment;
        });
      }, interval);
    }
  };

  const trackView = async (storyId: string) => {
    if (!user) return;
    if (trackedViewsRef.current.has(storyId)) return;

    trackedViewsRef.current.add(storyId);

    try {
      const { error } = await supabase.from('story_views').insert({
        story_id: storyId,
        user_id: user.id
      });

      if (!error) {
        setStoryGroup(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            stories: prev.stories.map(s =>
              s.story_id === storyId
                ? { ...s, is_viewed: true, views_count: s.views_count + 1 }
                : s
            )
          };
        });
      }
    } catch (err) {
      console.log('View tracking:', err);
    }
  };

  const nextStory = () => {
    if (!storyGroup) return;

    if (currentStoryIndex < storyGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const handleVideoProgress = () => {
    const video = videoRef.current;
    if (!video) return;

    const progress = (video.currentTime / video.duration) * 100;
    setProgress(progress);
  };

  const handleVideoEnded = () => {
    nextStory();
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, input')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / rect.width;

    if (clickPosition < 0.3) {
      previousStory();
    } else if (clickPosition > 0.7) {
      nextStory();
    }
  };

  // Long press to pause
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;

    longPressTimerRef.current = setTimeout(() => {
      setIsPaused(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }, 200);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    // Swipe down to close
    const deltaY = e.touches[0].clientY - touchStartYRef.current;
    if (deltaY > 100) {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    if (isPaused) {
      setIsPaused(false);
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !storyGroup) return;

    try {
      // In a real app, you'd send this as a DM or comment
      // For now, we'll just show a toast
      toast.success(`Reply sent to ${storyGroup.full_name}`);
      setReplyText('');
      setShowReply(false);
    } catch (err) {
      toast.error('Failed to send reply');
    }
  };

  const handleQuickReaction = async (emoji: string) => {
    if (!user || !storyGroup) return;

    toast.success(`Sent ${emoji} to ${storyGroup.full_name}`);
  };

  if (loading || !storyGroup) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const currentStory = storyGroup.stories[currentStoryIndex];
  const isOwnStory = user?.id === storyGroup.user_id;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {storyGroup.stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{
                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-full">
              <Avatar className="w-9 h-9 border-2 border-black">
                <AvatarImage src={storyGroup.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm">
                  {(storyGroup.full_name || storyGroup.username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="text-white">
              <p className="font-semibold text-sm">{storyGroup.username}</p>
              <p className="text-xs opacity-80">
                {getTimeAgo(currentStory.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isOwnStory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                  setShowUpload(true);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 h-auto"
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-white hover:bg-white/20 rounded-full p-2 h-auto"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Story Content - Fixed Uniform Container */}
      <div
        onClick={handleClick}
        className="w-full h-full flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-md h-[85vh] bg-black/20 rounded-lg overflow-hidden flex items-center justify-center">
          {currentStory.media_type === 'image' ? (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain select-none"
              draggable={false}
            />
          ) : (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="w-full h-full object-contain"
              onTimeUpdate={handleVideoProgress}
              onEnded={handleVideoEnded}
              playsInline
              loop={false}
            />
          )}
        </div>
      </div>

      {/* Pause Indicator */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-4">
            <div className="flex gap-1.5">
              <div className="w-1 h-6 bg-white rounded-full"></div>
              <div className="w-1 h-6 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* View Count for Own Stories */}
      {isOwnStory && (
        <div className="absolute bottom-20 left-4 z-10">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
            </svg>
            <span className="text-white text-sm font-medium">
              {currentStory.views_count}
            </span>
          </div>
        </div>
      )}

      {/* Reply/Reaction Bar (for other people's stories) */}
      {!isOwnStory && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 pb-safe">
          <div className="flex items-center gap-2">
            {/* Quick Reactions */}
            <div className="flex gap-2">
              {['❤️', '😂', '😮', '😢'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickReaction(emoji);
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-xl transition-all hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply Input */}
            <div className="flex-1 flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <input
                type="text"
                placeholder={`Reply to ${storyGroup.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => {
                  setIsPaused(true);
                  if (videoRef.current) videoRef.current.pause();
                }}
                onBlur={() => {
                  setIsPaused(false);
                  if (videoRef.current) videoRef.current.play().catch(() => {});
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSendReply();
                }}
                className="flex-1 bg-transparent text-white placeholder-white/60 text-sm outline-none"
                onClick={(e) => e.stopPropagation()}
              />
              {replyText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendReply();
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Hint (first time) */}
      <div className="absolute inset-0 pointer-events-none flex">
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
      </div>

      {/* Story Upload Dialog */}
      {showUpload && (
        <StoryUpload
          open={showUpload}
          onOpenChange={(open) => {
            setShowUpload(open);
            if (!open) setIsPaused(false);
          }}
          onSuccess={() => {
            fetchUserStories();
            setIsPaused(false);
          }}
        />
      )}
    </div>
  );
}

// Helper function to get relative time
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
