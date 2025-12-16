import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, User, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { StoryUpload } from './StoryUpload';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackedViewsRef = useRef<Set<string>>(new Set()); // Track which stories have been viewed

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

      // Fetch user's stories using the database function
      const { data, error } = await supabase.rpc('get_user_stories', {
        p_user_id: userId,
        p_viewer_id: user?.id || null
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        onClose();
        return;
      }

      // Fetch user info
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

    // Track view after 1 second (only if not already tracked)
    if (!trackedViewsRef.current.has(currentStory.story_id)) {
      setTimeout(() => {
        trackView(currentStory.story_id);
      }, 1000);
    }

    if (currentStory.media_type === 'video') {
      // For videos, progress is controlled by video playback
      const video = videoRef.current;
      if (video) {
        video.play().catch(() => {});
      }
    } else {
      // For images, use timer based on duration
      const duration = currentStory.duration * 1000; // Convert to milliseconds
      const interval = 50; // Update every 50ms
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

    // Check if already tracked in this session
    if (trackedViewsRef.current.has(storyId)) return;

    // Mark as tracked immediately to prevent duplicate calls
    trackedViewsRef.current.add(storyId);

    try {
      const { error } = await supabase.from('story_views').insert({
        story_id: storyId,
        user_id: user.id
      });

      // Only update view count if insert was successful (not a duplicate)
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
      // Silently fail - view might already be tracked
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
    // Prevent handling if clicking on buttons or interactive elements
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPosition = x / rect.width;

    if (clickPosition < 0.3) {
      previousStory();
    } else if (clickPosition > 0.7) {
      nextStory();
    } else {
      setIsPaused(prev => !prev);
      if (videoRef.current) {
        if (isPaused) {
          videoRef.current.play().catch(() => {});
        } else {
          videoRef.current.pause();
        }
      }
    }
  };

  if (loading || !storyGroup) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  const currentStory = storyGroup.stories[currentStoryIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1.5 p-3 bg-gradient-to-b from-black/40 to-transparent">
        {storyGroup.stories.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden shadow-sm">
            <div
              className="h-full bg-white transition-all duration-100 shadow-lg"
              style={{
                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-12 pb-4 bg-gradient-to-b from-black/60 via-black/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-white shadow-xl ring-2 ring-white/20">
              <AvatarImage src={storyGroup.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <p className="font-semibold text-sm drop-shadow-lg">{storyGroup.full_name}</p>
              <p className="text-xs opacity-90 drop-shadow-md">
                {new Date(currentStory.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user?.id === storyGroup.user_id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUpload(true);
                }}
                className="text-white bg-blue-600 hover:bg-blue-700 rounded-full p-2.5 transition-all hover:scale-110 shadow-lg"
                title="Add to your story"
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
              className="text-white hover:bg-white/20 rounded-full p-2.5 transition-all hover:scale-110"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div
        onClick={handleClick}
        className="w-full h-full flex items-center justify-center cursor-pointer"
      >
        {currentStory.media_type === 'image' ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="max-w-full max-h-full object-contain"
            onTimeUpdate={handleVideoProgress}
            onEnded={handleVideoEnded}
            playsInline
          />
        )}
      </div>

      {/* Mobile Navigation Indicators - show on first few taps */}
      <div className="md:hidden absolute inset-0 pointer-events-none flex">
        {currentStoryIndex > 0 && (
          <div className="w-1/3 h-full flex items-center justify-start pl-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-2 animate-pulse">
              <ChevronLeft className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
        <div className="flex-1 h-full" />
        {currentStoryIndex < storyGroup.stories.length - 1 && (
          <div className="w-1/3 h-full flex items-center justify-end pr-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-2 animate-pulse">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Desktop Navigation Arrows */}
      <div className="hidden md:flex absolute inset-0 items-center justify-between px-6 pointer-events-none">
        {currentStoryIndex > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              previousStory();
            }}
            className="pointer-events-auto text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3 shadow-xl transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}
        <div className="flex-1" />
        {currentStoryIndex < storyGroup.stories.length - 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              nextStory();
            }}
            className="pointer-events-auto text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full p-3 shadow-xl transition-all hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* View Count (for own stories) */}
      {user?.id === storyGroup.user_id && (
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="bg-gradient-to-r from-black/60 to-black/40 backdrop-blur-md rounded-2xl px-4 py-3 text-white text-center shadow-2xl border border-white/10">
            <p className="text-sm font-semibold drop-shadow-lg">
              👁️ {currentStory.views_count} {currentStory.views_count === 1 ? 'view' : 'views'}
            </p>
          </div>
        </div>
      )}

      {/* Pause Indicator */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-6 shadow-2xl">
            <div className="flex gap-2">
              <div className="w-2 h-8 bg-white rounded-full"></div>
              <div className="w-2 h-8 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Story Upload Dialog */}
      {showUpload && (
        <StoryUpload
          open={showUpload}
          onOpenChange={setShowUpload}
          onSuccess={() => {
            fetchUserStories(); // Refresh stories after upload
          }}
        />
      )}
    </div>
  );
}
