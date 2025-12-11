import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Track view after 1 second
    setTimeout(() => {
      trackView(currentStory.story_id);
    }, 1000);

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

    try {
      await supabase.from('story_views').insert({
        story_id: storyId,
        user_id: user.id
      });

      // Update local state
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
        if (videoRef.current.paused) {
          videoRef.current.play();
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
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {storyGroup.stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentStoryIndex ? '100%' : index === currentStoryIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-10 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={storyGroup.avatar_url} />
              <AvatarFallback>
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div className="text-white">
              <p className="font-semibold text-sm">{storyGroup.full_name}</p>
              <p className="text-xs opacity-70">
                {new Date(currentStory.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
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

      {/* Navigation Hints */}
      <div className="absolute inset-0 pointer-events-none flex">
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
      </div>

      {/* Desktop Navigation Arrows */}
      <div className="hidden md:flex absolute inset-0 items-center justify-between px-4 pointer-events-none">
        {currentStoryIndex > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={previousStory}
            className="pointer-events-auto text-white bg-black/30 hover:bg-black/50 rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
        )}
        <div className="flex-1" />
        {currentStoryIndex < storyGroup.stories.length - 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={nextStory}
            className="pointer-events-auto text-white bg-black/30 hover:bg-black/50 rounded-full"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        )}
      </div>

      {/* View Count (for own stories) */}
      {user?.id === storyGroup.user_id && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-center">
            <p className="text-sm font-medium">{currentStory.views_count} views</p>
          </div>
        </div>
      )}
    </div>
  );
}
