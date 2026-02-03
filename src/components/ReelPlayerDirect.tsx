import { useEffect, useRef } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { logger } from '@/lib/logger';

interface ReelPlayerDirectProps {
  videoUrl: string;
  muted?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlayerReady?: (player: Plyr) => void;
}

export function ReelPlayerDirect({ videoUrl, muted = false, onTimeUpdate, onEnded, onPlayerReady }: ReelPlayerDirectProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Plyr | null>(null);
  const onEndedRef = useRef(onEnded);

  // Keep onEnded ref updated
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  logger.debug('ReelPlayerDirect: Rendering for video', videoUrl);

  useEffect(() => {
    if (!videoRef.current) {
      logger.error('ReelPlayerDirect: Video ref is null');
      return;
    }

    logger.debug('ReelPlayerDirect: Initializing Plyr');

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
      logger.debug('ReelPlayerDirect: Plyr initialized');

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

      // Auto-play next when video ends
      player.on('ended', () => {
        logger.debug('ReelPlayerDirect: Video ended');
        if (onEndedRef.current) {
          onEndedRef.current();
        }
      });
    } catch (error) {
      logger.error('ReelPlayerDirect: Error initializing Plyr', error);
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
