declare module 'plyr' {
  export default class Plyr {
    constructor(element: HTMLElement | string, options?: any);
    play(): Promise<void>;
    pause(): void;
    stop(): void;
    restart(): void;
    destroy(): void;
    on(event: string, callback: () => void): void;
    off(event: string, callback: () => void): void;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    playing: boolean;
    paused: boolean;
    stopped: boolean;
    ended: boolean;
    buffered: number;
    loading: boolean;
    fullscreen: {
      active: boolean;
      enabled: boolean;
      enter(): void;
      exit(): void;
      toggle(): void;
    };
  }
}
