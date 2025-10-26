export interface VideoSource {
  url: string;
  type: string;
  quality?: string;
  label?: string;
}

export interface VideoTrack {
  src: string;
  kind: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata';
  srclang?: string;
  label?: string;
  default?: boolean;
}

export interface VideoPlayerConfig {
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  playsinline: boolean;
  preload: 'none' | 'metadata' | 'auto';
  poster?: string;
  replayOnEnd?: boolean;

  // UI Configuration
  showControls: boolean;
  showFullscreenButton: boolean;
  showVolumeButton: boolean;
  showProgressBar: boolean;
  showRetryButton: boolean;
  hideControlsDelay: number;

  // Interaction Configuration
  seekStep: number;
  volumeStep: number;

  // Tracks
  tracks?: VideoTrack[];

  // Custom styling
  theme?: 'default' | 'dark' | 'light' | 'custom';
  customColors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
}

export interface VideoPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  bufferedRanges: TimeRanges | null;
}

export interface VideoPlayerEvent {
  type: string;
  data?: any;
  timestamp: number;
}

export interface BufferedRange {
  start: number;
  end: number;
}

export interface VideoQuality {
  label: string;
  height: number;
  bitrate?: number;
  url: string;
}

export interface VideoPlayerAnalytics {
  playCount: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  bufferingEvents: number;
  errorEvents: number;
  seekEvents: number;
  qualityChanges: number;
}

export interface VideoPlayerOptions {
  enableAnalytics?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableGestures?: boolean;
  enablePictureInPicture?: boolean;
  enableAirPlay?: boolean;
  enableChromecast?: boolean;
  autoHideControls?: boolean;
  doubleClickDelay?: number;
  seekPreviewThumbnails?: boolean;
}

export type VideoPlayerEventType =
  | 'loadstart'
  | 'loadedmetadata'
  | 'loadeddata'
  | 'canplay'
  | 'canplaythrough'
  | 'play'
  | 'pause'
  | 'ended'
  | 'timeupdate'
  | 'progress'
  | 'volumechange'
  | 'error'
  | 'fullscreenchange'
  | 'qualitychange'
  | 'seek'
  | 'bufferstart'
  | 'bufferend';
