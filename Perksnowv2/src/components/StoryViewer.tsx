import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  views_count: number;
  expires_at: string;
  created_at: string;
  users: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface StoryViewerProps {
  stories: Story[];
  initialStoryIndex?: number;
  onClose: () => void;
}

export function StoryViewer({ stories, initialStoryIndex = 0, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const currentStory = stories[currentIndex];
  const isVideo = currentStory.media_type === 'video';
  const STORY_DURATION = 5000; // 5 seconds for images

  useEffect(() => {
    // Record story view
    recordView();
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (videoRef.current && isVideo) {
        videoRef.current.pause();
      }
      return;
    }

    // Reset progress
    setProgress(0);

    if (isVideo && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Video play failed:', error);
        });
      }
      return;
    }

    // Progress for images
    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;

      if (newProgress >= 100) {
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        goToNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, isPaused, isVideo, stories.length]);

  async function recordView() {
    if (!user || !currentStory) return;

    try {
      // Check if user already viewed this story
      const { data: existingView } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('viewer_id', user.id)
        .single();

      if (!existingView) {
        // Insert view record
        await supabase.from('story_views').insert({
          story_id: currentStory.id,
          viewer_id: user.id,
        });
      }
    } catch (err) {
      console.error('Error recording story view:', err);
    }
  }

  function goToNext() {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleVideoTimeUpdate() {
    if (videoRef.current) {
      const videoProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(videoProgress);
    }
  }

  function handleVideoEnded() {
    goToNext();
  }

  function formatTimeAgo(dateString: string): string {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  }

  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ zIndex: 9999999 }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation - Desktop only */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors hidden sm:flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors hidden sm:flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Story container */}
      <div
        className="relative w-full h-full sm:max-w-md sm:h-auto sm:max-h-[90vh] sm:aspect-[9/16] bg-black sm:rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-40 flex gap-1 p-2">
          {stories.map((_, index) => (
            <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* User info */}
        <div className="absolute top-4 left-0 right-0 z-40 px-4 flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src={currentStory.users.avatar_url} />
            <AvatarFallback>
              {currentStory.users.username?.[0] || currentStory.users.full_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">
              {currentStory.users.username || currentStory.users.full_name}
            </p>
            <p className="text-white/70 text-xs">{formatTimeAgo(currentStory.created_at)}</p>
          </div>
        </div>

        {/* Story media */}
        <div className="w-full h-full flex items-center justify-center">
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentStory.media_url}
              className="w-full h-full object-contain"
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
              playsInline
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* View count */}
        <div className="absolute bottom-4 left-0 right-0 z-40 px-4">
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>{currentStory.views_count} views</span>
          </div>
        </div>
      </div>
    </div>
  );
}
