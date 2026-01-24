import { useEffect, useRef } from 'react';
import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';

interface ReelPlayerProProps {
  videoUrl: string;
  muted?: boolean;
  autoplay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onReady?: () => void;
  className?: string;
}

export function ReelPlayerPro({
  videoUrl,
  muted = true,
  autoplay = true,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onReady,
  className = '',
}: ReelPlayerProProps) {
  const plyrRef = useRef<any>(null);

  // Plyr configuration optimized for reels/stories
  const plyrOptions = {
    controls: [
      'play-large', // Large play button in center
      'play', // Play/pause button
      'progress', // Progress bar
      'current-time', // Current time
      'mute', // Mute toggle
      'volume', // Volume control
      'fullscreen', // Fullscreen toggle
    ],
    autoplay: autoplay,
    muted: muted,
    clickToPlay: true, // Click anywhere to play/pause
    hideControls: true, // Auto-hide controls after inactivity
    resetOnEnd: false, // Don't reset to beginning when ended
    fullscreen: {
      enabled: true,
      fallback: true,
      iosNative: true, // Use native iOS fullscreen
    },
    ratio: '9:16', // Vertical video ratio (reels format)
    storage: { enabled: false }, // Don't save user preferences
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
    quality: {
      default: 720,
      options: [360, 480, 720, 1080],
    },
    // Disable download button for content protection
    disableContextMenu: false,
    // Keyboard shortcuts
    keyboard: { focused: true, global: false },
    // Tooltips
    tooltips: { controls: true, seek: true },
  };

  // Video source configuration
  const videoSource = {
    type: 'video' as const,
    sources: [
      {
        src: videoUrl,
        type: 'video/mp4',
      },
    ],
    poster: undefined, // Can add thumbnail URL here if needed
  };

  // Handle Plyr events
  useEffect(() => {
    const player = plyrRef.current?.plyr;
    if (!player) return;

    // Play event
    const handlePlay = () => {
      onPlay?.();
    };

    // Pause event
    const handlePause = () => {
      onPause?.();
    };

    // Ended event
    const handleEnded = () => {
      onEnded?.();
    };

    // Time update event
    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(player.currentTime, player.duration);
      }
    };

    // Ready event (video loaded and can play)
    const handleReady = () => {
      onReady?.();
    };

    // Attach event listeners
    player.on('play', handlePlay);
    player.on('pause', handlePause);
    player.on('ended', handleEnded);
    player.on('timeupdate', handleTimeUpdate);
    player.on('canplay', handleReady);

    // Cleanup
    return () => {
      player.off('play', handlePlay);
      player.off('pause', handlePause);
      player.off('ended', handleEnded);
      player.off('timeupdate', handleTimeUpdate);
      player.off('canplay', handleReady);
    };
  }, [onPlay, onPause, onEnded, onTimeUpdate, onReady]);

  // Expose player controls via ref
  useEffect(() => {
    const player = plyrRef.current?.plyr;
    if (player && muted !== undefined) {
      player.muted = muted;
    }
  }, [muted]);

  return (
    <div className={`reel-player-pro ${className}`}>
      <Plyr
        ref={plyrRef}
        source={videoSource}
        options={plyrOptions}
      />
    </div>
  );
}

// Export methods to control player externally if needed
export const getPlayerInstance = (ref: any) => {
  return ref?.current?.plyr;
};

export const playVideo = (ref: any) => {
  ref?.current?.plyr?.play();
};

export const pauseVideo = (ref: any) => {
  ref?.current?.plyr?.pause();
};

export const toggleMute = (ref: any) => {
  const player = ref?.current?.plyr;
  if (player) {
    player.muted = !player.muted;
  }
};

export const seekTo = (ref: any, time: number) => {
  const player = ref?.current?.plyr;
  if (player) {
    player.currentTime = time;
  }
};
