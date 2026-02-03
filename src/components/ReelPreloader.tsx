/**
 * ReelPreloader - Preloads adjacent videos for smoother playback
 *
 * Strategy (like TikTok/Instagram):
 * - Preload next 2 videos while current plays
 * - Keep previous video cached
 * - Use native video with preload="auto" for background loading
 */

import { useEffect, useRef, memo } from 'react';

interface ReelPreloaderProps {
  videoUrls: string[];
  currentIndex: number;
  preloadCount?: number; // How many videos to preload ahead (default: 2)
}

/**
 * Hidden video elements that preload in the background
 */
export const ReelPreloader = memo(function ReelPreloader({
  videoUrls,
  currentIndex,
  preloadCount = 2
}: ReelPreloaderProps) {
  const preloadedRef = useRef<Set<string>>(new Set());

  // Calculate which indices to preload
  const indicesToPreload: number[] = [];

  // Previous video (keep cached)
  if (currentIndex > 0) {
    indicesToPreload.push(currentIndex - 1);
  }

  // Next N videos
  for (let i = 1; i <= preloadCount; i++) {
    if (currentIndex + i < videoUrls.length) {
      indicesToPreload.push(currentIndex + i);
    }
  }

  return (
    <div className="hidden" aria-hidden="true">
      {indicesToPreload.map(index => (
        <PreloadVideo
          key={videoUrls[index]}
          url={videoUrls[index]}
          onLoaded={() => preloadedRef.current.add(videoUrls[index])}
        />
      ))}
    </div>
  );
});

/**
 * Individual preload video - loads silently in background
 */
const PreloadVideo = memo(function PreloadVideo({
  url,
  onLoaded
}: {
  url: string;
  onLoaded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      onLoaded();
    };

    video.addEventListener('canplaythrough', handleCanPlay);

    // Start loading
    video.load();

    return () => {
      video.removeEventListener('canplaythrough', handleCanPlay);
    };
  }, [url, onLoaded]);

  return (
    <video
      ref={videoRef}
      src={url}
      preload="auto"
      muted
      playsInline
      style={{ width: 1, height: 1, position: 'absolute', opacity: 0 }}
    />
  );
});

/**
 * Hook to manage video preloading state
 */
export function useVideoPreloader(videoUrls: string[], currentIndex: number) {
  const preloadedVideos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const preloadCount = 2;

  useEffect(() => {
    // Preload next videos
    const toPreload: string[] = [];

    // Previous
    if (currentIndex > 0 && videoUrls[currentIndex - 1]) {
      toPreload.push(videoUrls[currentIndex - 1]);
    }

    // Next 2
    for (let i = 1; i <= preloadCount; i++) {
      if (videoUrls[currentIndex + i]) {
        toPreload.push(videoUrls[currentIndex + i]);
      }
    }

    // Create preload elements for new videos
    toPreload.forEach(url => {
      if (!preloadedVideos.current.has(url)) {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.src = url;
        video.load();
        preloadedVideos.current.set(url, video);
      }
    });

    // Cleanup old preloaded videos (keep only adjacent ones)
    const keepUrls = new Set([
      videoUrls[currentIndex],
      ...toPreload
    ]);

    preloadedVideos.current.forEach((video, url) => {
      if (!keepUrls.has(url)) {
        video.src = '';
        video.load();
        preloadedVideos.current.delete(url);
      }
    });
  }, [currentIndex, videoUrls]);

  return {
    isPreloaded: (url: string) => preloadedVideos.current.has(url),
    getPreloadedVideo: (url: string) => preloadedVideos.current.get(url)
  };
}

/**
 * Lightweight video player for reels - no Plyr overhead
 * Uses native video element for fastest loading
 */
interface FastReelPlayerProps {
  videoUrl: string;
  isActive: boolean;
  muted: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export function FastReelPlayer({
  videoUrl,
  isActive,
  muted,
  onTimeUpdate,
  onEnded
}: FastReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video.play().catch(() => {
        // Autoplay blocked - user needs to interact first
      });
    } else {
      video.pause();
    }
  }, [isActive, videoUrl]);

  // Update muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  // Time update handler
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(video.currentTime, video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onTimeUpdate]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      className="w-full h-full object-contain"
      playsInline
      loop
      muted={muted}
      preload="auto"
      onEnded={onEnded}
    />
  );
}

export default ReelPreloader;
