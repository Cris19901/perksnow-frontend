import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface ReelPlayerDirectProps {
  videoUrl: string;
  muted?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function ReelPlayerDirect({ videoUrl, muted = true, onTimeUpdate }: ReelPlayerDirectProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!videoRef.current) {
      console.error('❌ ReelPlayerDirect: Video ref is null');
      return;
    }

    console.log('🎬 ReelPlayerDirect: Initializing Plyr for video:', videoUrl);

    try {
      // Initialize Plyr directly on the video element
      const player = new Plyr(videoRef.current, {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
        autoplay: true,
        muted: muted,
        clickToPlay: true,
        hideControls: true,
        fullscreen: {
          enabled: true,
          fallback: true,
          iosNative: true,
        },
      });

      playerRef.current = player;
      console.log('✅ Plyr initialized successfully:', player);
    } catch (error) {
      console.error('❌ Error initializing Plyr:', error);
      return;
    }

    // Event listeners
    player.on('timeupdate', () => {
      if (onTimeUpdate) {
        onTimeUpdate(player.currentTime, player.duration);
      }
    });

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
