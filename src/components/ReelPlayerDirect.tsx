import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface ReelPlayerDirectProps {
  videoUrl: string;
  muted?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPlayerReady?: (player: Plyr) => void;
}

export function ReelPlayerDirect({ videoUrl, muted = false, onTimeUpdate, onPlayerReady }: ReelPlayerDirectProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  console.log('🔵 ReelPlayerDirect: Component rendered for video:', videoUrl);

  useEffect(() => {
    console.log('🟢 ReelPlayerDirect: useEffect triggered');
    console.log('🟢 ReelPlayerDirect: videoRef.current:', videoRef.current);

    if (!videoRef.current) {
      console.error('❌ ReelPlayerDirect: Video ref is null - DOM element not found!');
      return;
    }

    console.log('🎬 ReelPlayerDirect: Initializing Plyr for video:', videoUrl);

    try {
      // Initialize Plyr directly on the video element
      const player = new Plyr(videoRef.current, {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
        autoplay: true,
        muted: muted,
        clickToPlay: false, // Disabled to prevent overlay buttons from triggering play/pause
        hideControls: true,
        fullscreen: {
          enabled: true,
          fallback: true,
          iosNative: true,
        },
      });

      playerRef.current = player;
      console.log('✅ Plyr initialized successfully:', player);

      // Notify parent that player is ready
      if (onPlayerReady) {
        onPlayerReady(player);
      }

      // Event listeners
      player.on('timeupdate', () => {
        if (onTimeUpdate) {
          onTimeUpdate(player.currentTime, player.duration);
        }
      });
    } catch (error) {
      console.error('❌ Error initializing Plyr:', error);
      return;
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoUrl]);

  // Update muted state when prop changes
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.muted = muted;
    }
  }, [muted]);

  return (
    <div className="w-full h-full bg-black reel-player-pro">
      <video
        ref={videoRef}
        className="plyr-video"
        playsInline
        crossOrigin="anonymous"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
}
