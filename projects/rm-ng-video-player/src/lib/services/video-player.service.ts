import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map, filter, shareReplay } from 'rxjs/operators';
import {
  VideoPlayerState,
  VideoPlayerAnalytics,
  VideoPlayerEvent,
  VideoSource,
  VideoQuality,
} from '../interfaces/video-player.interface';

@Injectable({
  providedIn: 'root',
})
export class VideoPlayerService {
  private destroyRef = inject(DestroyRef);

  // Analytics tracking
  private analytics = signal<VideoPlayerAnalytics>({
    playCount: 0,
    totalWatchTime: 0,
    averageWatchTime: 0,
    completionRate: 0,
    bufferingEvents: 0,
    errorEvents: 0,
    seekEvents: 0,
    qualityChanges: 0,
  });

  // Global player instances tracking
  private playerInstances = new Map<string, any>();
  private activePlayer = signal<string | null>(null);

  // Network and performance monitoring
  private networkStatus = signal<'online' | 'offline'>('online');
  private connectionSpeed = signal<'slow' | 'fast' | 'unknown'>('unknown');

  // Picture-in-Picture support
  private pipSupported = signal<boolean>(false);
  private pipActive = signal<boolean>(false);

  constructor() {
    this.initializeNetworkMonitoring();
    this.initializePictureInPictureSupport();
  }

  /**
   * Register a video player instance
   */
  registerPlayer(id: string, playerRef: any): void {
    this.playerInstances.set(id, playerRef);
  }

  /**
   * Unregister a video player instance
   */
  unregisterPlayer(id: string): void {
    this.playerInstances.delete(id);
    if (this.activePlayer() === id) {
      this.activePlayer.set(null);
    }
  }

  /**
   * Set the active player
   */
  setActivePlayer(id: string): void {
    if (this.playerInstances.has(id)) {
      this.activePlayer.set(id);
    }
  }

  /**
   * Get analytics data
   */
  getAnalytics(): VideoPlayerAnalytics {
    return this.analytics();
  }

  /**
   * Update analytics with new data
   */
  updateAnalytics(update: Partial<VideoPlayerAnalytics>): void {
    this.analytics.update(current => ({ ...current, ...update }));
  }

  /**
   * Track video event for analytics
   */
  trackEvent(event: VideoPlayerEvent, playerId?: string): void {
    const currentAnalytics = this.analytics();

    switch (event.type) {
      case 'play':
        this.analytics.update(a => ({
          ...a,
          playCount: a.playCount + 1,
        }));
        break;

      case 'error':
        this.analytics.update(a => ({
          ...a,
          errorEvents: a.errorEvents + 1,
        }));
        break;

      case 'seek':
        this.analytics.update(a => ({
          ...a,
          seekEvents: a.seekEvents + 1,
        }));
        break;

      case 'bufferstart':
        this.analytics.update(a => ({
          ...a,
          bufferingEvents: a.bufferingEvents + 1,
        }));
        break;

      case 'qualitychange':
        this.analytics.update(a => ({
          ...a,
          qualityChanges: a.qualityChanges + 1,
        }));
        break;
    }
  }

  /**
   * Get optimal video quality based on network conditions
   */
  getOptimalQuality(availableQualities: VideoQuality[]): VideoQuality | null {
    if (availableQualities.length === 0) return null;

    const connectionSpeed = this.connectionSpeed();
    const networkStatus = this.networkStatus();

    if (networkStatus === 'offline') {
      return null;
    }

    // Sort qualities by height (resolution)
    const sortedQualities = [...availableQualities].sort((a, b) => b.height - a.height);

    switch (connectionSpeed) {
      case 'slow':
        // Return lowest quality for slow connections
        return sortedQualities[sortedQualities.length - 1];

      case 'fast':
        // Return highest quality for fast connections
        return sortedQualities[0];

      default:
        // Return medium quality or best available
        const mediumIndex = Math.floor(sortedQualities.length / 2);
        return sortedQualities[mediumIndex] || sortedQualities[0];
    }
  }

  /**
   * Generate adaptive streaming manifest
   */
  generateAdaptiveManifest(sources: VideoSource[]): string | null {
    if (sources.length === 0) return null;

    // Simple HLS-style manifest generation
    const manifest = sources
      .map(source => `#EXT-X-STREAM-INF:BANDWIDTH=1000000\n${source.url}`)
      .join('\n');

    return `#EXTM3U\n#EXT-X-VERSION:3\n${manifest}`;
  }

  /**
   * Prefetch video segments for smoother playback
   */
  prefetchSegments(videoUrl: string, segmentCount: number = 3): Promise<void[]> {
    const prefetchPromises: Promise<void>[] = [];

    for (let i = 0; i < segmentCount; i++) {
      const segmentUrl = `${videoUrl}?segment=${i}`;
      const prefetchPromise = fetch(segmentUrl, {
        method: 'HEAD',
        cache: 'force-cache',
      }).then(() => void 0);

      prefetchPromises.push(prefetchPromise);
    }

    return Promise.all(prefetchPromises);
  }

  /**
   * Picture-in-Picture support
   */
  isPictureInPictureSupported(): boolean {
    return this.pipSupported();
  }

  isPictureInPictureActive(): boolean {
    return this.pipActive();
  }

  async enterPictureInPicture(videoElement: HTMLVideoElement): Promise<void> {
    if (!this.pipSupported()) {
      throw new Error('Picture-in-Picture is not supported');
    }

    try {
      await (videoElement as any).requestPictureInPicture();
      this.pipActive.set(true);
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture:', error);
      throw error;
    }
  }

  async exitPictureInPicture(): Promise<void> {
    try {
      await (document as any).exitPictureInPicture();
      this.pipActive.set(false);
    } catch (error) {
      console.error('Failed to exit Picture-in-Picture:', error);
      throw error;
    }
  }

  /**
   * Memory optimization utilities
   */
  cleanupUnusedResources(): void {
    // Clean up inactive player instances
    const activeId = this.activePlayer();
    this.playerInstances.forEach((player, id) => {
      if (id !== activeId && player.cleanup) {
        player.cleanup();
      }
    });
  }

  /**
   * Performance monitoring
   */
  measurePerformance<T>(operation: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();

    console.log(`Performance: ${operation} took ${endTime - startTime} milliseconds`);
    return result;
  }

  /**
   * Detect if device supports hardware acceleration
   */
  detectHardwareAcceleration(): Promise<boolean> {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const gl =
        (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

      if (!gl) {
        resolve(false);
        return;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
        const isHardwareAccelerated =
          !renderer.includes('SwiftShader') && !renderer.includes('Software');
        resolve(isHardwareAccelerated);
      } else {
        resolve(true); // Assume hardware acceleration if we can't detect
      }

      canvas.remove();
    });
  }

  private initializeNetworkMonitoring(): void {
    // Monitor online/offline status
    merge(
      fromEvent(window, 'online').pipe(map(() => 'online' as const)),
      fromEvent(window, 'offline').pipe(map(() => 'offline' as const))
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(status => {
        this.networkStatus.set(status);
      });

    // Estimate connection speed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const updateConnectionSpeed = () => {
          const effectiveType = connection.effectiveType;
          if (effectiveType === '4g') {
            this.connectionSpeed.set('fast');
          } else if (effectiveType === '3g' || effectiveType === '2g') {
            this.connectionSpeed.set('slow');
          } else {
            this.connectionSpeed.set('unknown');
          }
        };

        updateConnectionSpeed();
        connection.addEventListener('change', updateConnectionSpeed);
      }
    }
  }

  private initializePictureInPictureSupport(): void {
    this.pipSupported.set('pictureInPictureEnabled' in document);

    if (this.pipSupported()) {
      fromEvent(document, 'enterpictureinpicture')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.pipActive.set(true));

      fromEvent(document, 'leavepictureinpicture')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.pipActive.set(false));
    }
  }
}
