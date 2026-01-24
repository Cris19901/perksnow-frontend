import { useRef, useEffect } from 'react';
import Plyr from 'plyr-react';
import 'plyr/dist/plyr.css';

interface ReelPlayerSimpleProps {
  videoUrl: string;
  muted?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function ReelPlayerSimple({ videoUrl, muted = true, onTimeUpdate }: ReelPlayerSimpleProps) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const player = ref.current?.plyr;
    if (!player) return;

    const handleTimeUpdate = () => {
      if (onTimeUpdate && player.currentTime && player.duration) {
        onTimeUpdate(player.currentTime, player.duration);
      }
    };

    player.on('timeupdate', handleTimeUpdate);

    return () => {
      player.off('timeupdate', handleTimeUpdate);
    };
  }, [onTimeUpdate]);

  return (
    <div className="w-full h-full bg-black">
      <Plyr
        ref={ref}
        source={{
          type: 'video',
          sources: [
            {
              src: videoUrl,
              provider: 'html5',
            },
          ],
        }}
        options={{
          controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
          autoplay: true,
          muted: muted,
          clickToPlay: true,
          hideControls: true,
        }}
      />
    </div>
  );
}
