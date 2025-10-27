import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ViewChild,
  HostListener,
  signal,
  computed,
  effect,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { fromEvent, merge } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import {
  VideoPlayerConfig,
  VideoPlayerState,
  VideoSource,
  VideoPlayerEvent,
} from './interfaces/video-player.interface';
import { VideoProgressComponent } from './components/video-progress/video-progress.component';

@Component({
  selector: 'rm-ng-video-player',
  standalone: true,
  imports: [CommonModule, VideoProgressComponent],
  template: `
    <div
      class="rm-video-player"
      [class.rm-video-player--fullscreen]="isFullscreen()"
      [class.rm-video-player--loading]="isLoading()"
      [class.rm-video-player--error]="hasError()"
      [class.rm-video-player--controls-visible]="showControls()"
      [class.rm-video-player--playing]="isPlaying()"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <!-- Apple-style center play button -->
      @if (!isLoading() && !hasError() && !isPlaying()) {
        <div class="rm-video-player__center-play" (click)="togglePlayPause()">
          <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
            <path d="M2 2L22 14L2 26V2Z" fill="currentColor" />
          </svg>
        </div>
      }

      <video
        #videoElement
        class="rm-video-player__video"
        [src]="currentSource()?.url"
        [poster]="config().poster"
        [muted]="isMuted()"
        [loop]="loopEnabled()"
        [autoplay]="config().autoplay"
        [attr.playsinline]="config().playsinline"
        [preload]="config().preload"
        (loadstart)="onLoadStart()"
        (loadedmetadata)="onLoadedMetadata()"
        (loadeddata)="onLoadedData()"
        (canplay)="onCanPlay()"
        (canplaythrough)="onCanPlayThrough()"
        (play)="onPlay()"
        (pause)="onPause()"
        (ended)="onEnded()"
        (timeupdate)="onTimeUpdate()"
        (progress)="onProgress()"
        (volumechange)="onVolumeChange()"
        (error)="onError($event)"
        (click)="togglePlayPause()"
      >
        @if (sources().length > 0) {
          @for (source of sources(); track source.url) {
            <source [src]="source.url" [type]="source.type" />
          }
        }

        @if (config().tracks && config().tracks!.length > 0) {
          @for (track of config().tracks!; track track.src) {
            <track
              [src]="track.src"
              [kind]="track.kind"
              [srclang]="track.srclang"
              [label]="track.label"
              [default]="track.default"
            />
          }
        }

        Your browser does not support the video tag.
      </video>

      @if (isLoading()) {
        <div class="rm-video-player__loading">
          <div class="rm-video-player__spinner"></div>
          <span>Loading...</span>
        </div>
      }

      @if (hasError()) {
        <div class="rm-video-player__error">
          <div class="rm-video-player__error-icon">⚠</div>
          <div class="rm-video-player__error-message">
            {{ errorMessage() }}
          </div>
          @if (config().showRetryButton) {
            <button class="rm-video-player__retry-button" (click)="retry()">Retry</button>
          }
        </div>
      }

      @if (showControls() && !hasError()) {
        <div class="rm-video-player__controls">
          <!-- Progress Bar (YouTube sequence 1) -->
          <rm-video-progress
            [currentTime]="currentTime()"
            [duration]="duration()"
            [buffered]="bufferedRanges()"
            (seek)="seek($event)"
          >
          </rm-video-progress>

          <div class="rm-video-player__controls-bottom">
            <!-- Left Controls Group (YouTube sequence 2) -->
            <div class="rm-video-player__controls-left">
              <!-- Play/Pause Button -->
              <button
                class="rm-control-btn rm-control-btn--play-pause"
                (click)="togglePlayPause()"
                [attr.data-tooltip]="isPlaying() ? 'Pause (Space)' : 'Play (Space)'"
              >
                <svg
                  *ngIf="!isPlaying()"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <svg
                  *ngIf="isPlaying()"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              </button>

              <!-- Skip Backward 10s -->
              <button
                class="rm-control-btn rm-control-btn--skip rm-control-btn--skip-back"
                (click)="skipBackward()"
                data-tooltip="Skip backward 10s (J)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <!-- Curved arrow pointing left with replay symbol -->
                  <path
                    d="M12,5V1L7,6l5,5V7c3.31,0,6,2.69,6,6s-2.69,6-6,6s-6-2.69-6-6H4c0,4.42,3.58,8,8,8s8-3.58,8-8S16.42,5,12,5z"
                  />
                  <!-- Double left arrows -->
                  <path d="M11 18V6l-2.5 6L11 18zm-4 0V6l-2.5 6L7 18z" />
                </svg>
              </button>

              <!-- Skip Forward 10s -->
              <button
                class="rm-control-btn rm-control-btn--skip rm-control-btn--skip-forward"
                (click)="skipForward()"
                data-tooltip="Skip forward 10s (L)"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <!-- Curved arrow pointing right with forward symbol -->
                  <path
                    d="M12,5V1l5,5l-5,5V7c-3.31,0-6,2.69-6,6s2.69,6,6,6s6-2.69,6-6h2c0,4.42-3.58,8-8,8s-8-3.58-8-8S7.58,5,12,5z"
                  />
                  <!-- Double right arrows -->
                  <path d="M13 6v12l2.5-6L13 6zm4 0v12l2.5-6L17 6z" />
                </svg>
              </button>

              <!-- Volume Controls -->
              <div
                class="rm-volume-container"
                (mouseenter)="showVolumeSlider.set(true)"
                (mouseleave)="showVolumeSlider.set(false)"
              >
                <button
                  class="rm-control-btn rm-control-btn--volume"
                  (click)="toggleMute()"
                  [attr.data-tooltip]="isMuted() ? 'Unmute (M)' : 'Mute (M)'"
                >
                  <svg
                    *ngIf="!isMuted() && volume() > 0.5"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                    />
                  </svg>
                  <svg
                    *ngIf="!isMuted() && volume() <= 0.5 && volume() > 0"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"
                    />
                  </svg>
                  <svg
                    *ngIf="isMuted() || volume() === 0"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                    />
                  </svg>
                </button>
                <div
                  class="rm-volume-slider-container"
                  [class.rm-volume-slider-container--visible]="showVolumeSlider()"
                >
                  <input
                    type="range"
                    class="rm-volume-slider"
                    min="0"
                    max="1"
                    step="0.01"
                    [value]="volume()"
                    (input)="setVolume(+$any($event.target).value)"
                  />
                </div>
              </div>

              <!-- Time Display -->
              <div class="rm-time-display">
                <span class="rm-time-current">{{ formatTime(currentTime()) }}</span>
                <span class="rm-time-separator">/</span>
                <span class="rm-time-duration">{{ formatTime(duration()) }}</span>
              </div>
            </div>

            <!-- Right Controls Group (YouTube sequence 3) -->
            <div class="rm-video-player__controls-right">
              <!-- Captions/Subtitles Button -->
              <button
                class="rm-control-btn rm-control-btn--captions"
                [class.rm-control-btn--active]="showCaptions()"
                (click)="toggleCaptions()"
                [attr.data-tooltip]="
                  showCaptions() ? 'Turn off captions (C)' : 'Turn on captions (C)'
                "
              >
                @if (showCaptions()) {
                  <!-- Captions ON - solid filled background -->
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" fill="currentColor" />
                    <text
                      x="12"
                      y="14.5"
                      text-anchor="middle"
                      font-size="8"
                      font-weight="bold"
                      fill="#000"
                    >
                      CC
                    </text>
                  </svg>
                } @else {
                  <!-- Captions OFF - outline only -->
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                    <text
                      x="12"
                      y="14.5"
                      text-anchor="middle"
                      font-size="8"
                      font-weight="bold"
                      fill="currentColor"
                    >
                      CC
                    </text>
                  </svg>
                }
              </button>

              <!-- Settings/Quality Button -->
              <div class="rm-settings-container" (clickOutside)="closeSettings()">
                <button
                  class="rm-control-btn rm-control-btn--settings"
                  [class.rm-control-btn--active]="showSettingsMenu()"
                  (click)="toggleSettings()"
                  data-tooltip="Settings"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"
                    />
                  </svg>
                </button>

                <!-- Settings Menu -->
                @if (showSettingsMenu()) {
                  <div class="rm-settings-menu">
                    <!-- Main Menu -->
                    @if (!currentSettingsPanel()) {
                      <div class="rm-settings-item" (click)="openSettingsPanel('speed')">
                        <span>Playback speed</span>
                        <div class="rm-settings-value">{{ getSpeedLabel() }}</div>
                        <svg class="rm-settings-arrow" width="16" height="16" viewBox="0 0 24 24">
                          <path
                            d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12l-4.58 4.59z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div class="rm-settings-item" (click)="openSettingsPanel('quality')">
                        <span>Quality</span>
                        <div class="rm-settings-value">{{ getQualityLabel() }}</div>
                        <svg class="rm-settings-arrow" width="16" height="16" viewBox="0 0 24 24">
                          <path
                            d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12l-4.58 4.59z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div class="rm-settings-item" (click)="openSettingsPanel('sleep')">
                        <span>Sleep timer</span>
                        <div class="rm-settings-value">{{ getSleepTimerLabel() }}</div>
                        <svg class="rm-settings-arrow" width="16" height="16" viewBox="0 0 24 24">
                          <path
                            d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12l-4.58 4.59z"
                            fill="currentColor"
                          />
                        </svg>
                      </div>
                      <div class="rm-settings-item" (click)="toggleLoop()">
                        <span>Loop</span>
                        <div class="rm-settings-value">{{ loopEnabled() ? 'On' : 'Off' }}</div>
                      </div>
                    }

                    <!-- Speed Panel -->
                    @if (currentSettingsPanel() === 'speed') {
                      <div class="rm-settings-header">
                        <button class="rm-settings-back" (click)="closeSettingsPanel()">
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path
                              d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <span>Playback speed</span>
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 0.25"
                        (click)="setPlaybackSpeed(0.25)"
                      >
                        0.25
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 0.5"
                        (click)="setPlaybackSpeed(0.5)"
                      >
                        0.5
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 0.75"
                        (click)="setPlaybackSpeed(0.75)"
                      >
                        0.75
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 1"
                        (click)="setPlaybackSpeed(1)"
                      >
                        Normal
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 1.25"
                        (click)="setPlaybackSpeed(1.25)"
                      >
                        1.25
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 1.5"
                        (click)="setPlaybackSpeed(1.5)"
                      >
                        1.5
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="playbackSpeed() === 2"
                        (click)="setPlaybackSpeed(2)"
                      >
                        2
                      </div>
                    }

                    <!-- Quality Panel -->
                    @if (currentSettingsPanel() === 'quality') {
                      <div class="rm-settings-header">
                        <button class="rm-settings-back" (click)="closeSettingsPanel()">
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path
                              d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <span>Quality</span>
                      </div>
                      <!-- Auto quality option -->
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="currentQuality() === 'auto'"
                        (click)="changeQuality('auto')"
                      >
                        Auto
                      </div>

                      <!-- Dynamic quality options based on video sources -->
                      @for (source of sources(); track source.url) {
                        @if (source.label) {
                          <div
                            class="rm-settings-option"
                            [class.rm-settings-option--active]="currentSource()?.url === source.url"
                            (click)="changeVideoSource(source)"
                          >
                            {{ source.label }}
                          </div>
                        }
                      }
                    }

                    <!-- Sleep Timer Panel -->
                    @if (currentSettingsPanel() === 'sleep') {
                      <div class="rm-settings-header">
                        <button class="rm-settings-back" (click)="closeSettingsPanel()">
                          <svg width="16" height="16" viewBox="0 0 24 24">
                            <path
                              d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"
                              fill="currentColor"
                            />
                          </svg>
                        </button>
                        <span>Sleep timer</span>
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="!sleepTimerActive()"
                        (click)="setSleepTimer(null)"
                      >
                        Off
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="sleepTimer() === 15"
                        (click)="setSleepTimer(15)"
                      >
                        15 minutes
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="sleepTimer() === 30"
                        (click)="setSleepTimer(30)"
                      >
                        30 minutes
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="sleepTimer() === 60"
                        (click)="setSleepTimer(60)"
                      >
                        1 hour
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="sleepTimer() === 90"
                        (click)="setSleepTimer(90)"
                      >
                        1.5 hours
                      </div>
                      <div
                        class="rm-settings-option"
                        [class.rm-settings-option--active]="sleepTimer() === 120"
                        (click)="setSleepTimer(120)"
                      >
                        2 hours
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- Picture-in-Picture Button -->
              <button
                class="rm-control-btn rm-control-btn--pip"
                (click)="togglePictureInPicture()"
                data-tooltip="Picture-in-picture (I)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16.01H3V4.99h18v14.02z"
                  />
                </svg>
              </button>

              <!-- Fullscreen Button -->
              <button
                class="rm-control-btn rm-control-btn--fullscreen"
                (click)="toggleFullscreen()"
                [attr.data-tooltip]="isFullscreen() ? 'Exit fullscreen (F)' : 'Fullscreen (F)'"
              >
                <svg
                  *ngIf="!isFullscreen()"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
                  />
                </svg>
                <svg
                  *ngIf="isFullscreen()"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .rm-video-player {
      position: relative;
      display: inline-block;
      width: 100%;
      max-width: 100%;
      background: linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 20, 0.98) 100%);
      backdrop-filter: blur(60px) saturate(180%);
      -webkit-backdrop-filter: blur(60px) saturate(180%);
      font-family:
        -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
      user-select: none;
      overflow: hidden;
      border-radius: 20px;
      border: 0.5px solid rgba(255, 255, 255, 0.08);
      box-shadow:
        0 32px 64px rgba(0, 0, 0, 0.6),
        0 0 0 0.5px rgba(255, 255, 255, 0.05),
        inset 0 1px 1px rgba(255, 255, 255, 0.1),
        inset 0 0 60px rgba(255, 255, 255, 0.02);
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      cursor: pointer;
    }

    .rm-video-player::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 70%),
        radial-gradient(circle at 70% 70%, rgba(120, 119, 198, 0.02) 0%, transparent 70%);
      border-radius: 20px;
      pointer-events: none;
    }

    .rm-video-player:hover {
      border-color: rgba(255, 255, 255, 0.12);
    }

    .rm-video-player__video {
      width: 100%;
      height: auto;
      display: block;
      outline: none;
      border-radius: 20px;
      transition: filter 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .rm-video-player--loading .rm-video-player__video {
      filter: brightness(0.8) blur(0.5px);
    }

    /* Apple-style center play button */
    .rm-video-player__center-play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80px;
      height: 80px;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.75) 100%);
      backdrop-filter: blur(40px) saturate(200%);
      -webkit-backdrop-filter: blur(40px) saturate(200%);
      border: 0.5px solid rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      z-index: 5;
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.2),
        inset 0 0 20px rgba(255, 255, 255, 0.05);
    }

    .rm-video-player:not(.rm-video-player--playing):hover .rm-video-player__center-play {
      opacity: 1;
    }

    .rm-video-player__center-play svg {
      width: 28px;
      height: 28px;
      fill: rgba(255, 255, 255, 0.95);
      margin-left: 4px;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .rm-video-player__center-play:hover {
      transform: translate(-50%, -50%) scale(1.08);
      background: radial-gradient(circle, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.85) 100%);
      box-shadow:
        0 30px 60px rgba(0, 0, 0, 0.6),
        inset 0 1px 2px rgba(255, 255, 255, 0.3),
        inset 0 0 30px rgba(255, 255, 255, 0.08);
    }

    .rm-video-player__center-play:active {
      transform: translate(-50%, -50%) scale(1.02);
      transition: all 0.15s ease;
    }

    .rm-video-player--fullscreen {
      position: fixed !important;
      top: 0;
      left: 0;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999;
      border-radius: 0;
      box-shadow: none;
      transform: none;
    }

    .rm-video-player--fullscreen .rm-video-player__video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 0;
    }

    .rm-video-player__loading,
    .rm-video-player__error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      color: rgba(255, 255, 255, 0.95);
      z-index: 10;
      text-align: center;
      background: linear-gradient(145deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.65) 100%);
      backdrop-filter: blur(60px) saturate(200%);
      -webkit-backdrop-filter: blur(60px) saturate(200%);
      border: 0.5px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      padding: 32px 40px;
      box-shadow:
        0 20px 40px rgba(0, 0, 0, 0.5),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
    }

    .rm-video-player__spinner {
      width: 52px;
      height: 52px;
      border: 2.5px solid rgba(255, 255, 255, 0.12);
      border-top: 2.5px solid rgba(255, 255, 255, 0.85);
      border-radius: 50%;
      animation: spin 1.4s cubic-bezier(0.23, 1, 0.32, 1) infinite;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .rm-video-player__error-icon {
      font-size: 56px;
      background: linear-gradient(145deg, #ff6b6b 0%, #ff8e8e 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 4px 16px rgba(255, 107, 107, 0.4));
      text-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
    }

    .rm-video-player__error-message {
      font-size: 17px;
      font-weight: 500;
      text-align: center;
      max-width: 280px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.92);
      letter-spacing: -0.01em;
    }

    .rm-video-player__loading span {
      font-size: 17px;
      font-weight: 500;
      letter-spacing: -0.01em;
      color: rgba(255, 255, 255, 0.92);
    }

    .rm-video-player__retry-button {
      padding: 14px 28px;
      background: linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.06) 100%
      );
      backdrop-filter: blur(30px) saturate(200%);
      -webkit-backdrop-filter: blur(30px) saturate(200%);
      border: 0.5px solid rgba(255, 255, 255, 0.18);
      color: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      letter-spacing: -0.01em;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      position: relative;
      overflow: hidden;
      box-shadow:
        0 8px 20px rgba(0, 0, 0, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.2);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .rm-video-player__retry-button:hover {
      background: linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.15) 0%,
        rgba(255, 255, 255, 0.08) 100%
      );
      border-color: rgba(255, 255, 255, 0.25);
      transform: translateY(-3px);
      box-shadow:
        0 16px 40px rgba(0, 0, 0, 0.4),
        inset 0 1px 2px rgba(255, 255, 255, 0.3);
    }

    .rm-video-player__retry-button:active {
      transform: translateY(-1px);
      transition: all 0.15s ease;
    }

    .rm-video-player__controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: transparent;
      padding: 0px 8px 2px;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      line-height: 1;
    }

    .rm-video-player--controls-visible .rm-video-player__controls {
      opacity: 1;
      pointer-events: all;
    }

    .rm-video-player__controls-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      margin-top: 0;
      margin-bottom: 0;
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      line-height: 1;
    }

    .rm-video-player__controls-left,
    .rm-video-player__controls-right {
      display: flex;
      align-items: center;
      gap: 12px;
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    /* YouTube-style Control Buttons - Clean Design */
    .rm-control-btn {
      position: relative;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent !important;
      border: none !important;
      border-radius: 0;
      color: rgba(255, 255, 255, 0.92);
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.23, 1, 0.32, 1);
      overflow: visible;
      font-size: 0;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow: none !important;
      margin: 0;
      padding: 0;
      line-height: 1;
    }

    .rm-control-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .rm-control-btn:hover {
      background: transparent;
      transform: scale(1.02);
    }

    .rm-control-btn:hover::before {
      opacity: 1;
    }

    .rm-control-btn:active {
      transform: scale(0.98);
      transition: all 0.15s ease;
    }

    .rm-control-btn svg {
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }

    /* Play/Pause Button - Larger */
    .rm-control-btn--play-pause {
      width: 32px;
      height: 32px;
      background: transparent;
      margin: 0;
      padding: 0;
      line-height: 1;
    }

    .rm-control-btn--play-pause:hover {
      background: transparent;
      transform: scale(1.05);
    }

    /* Skip Buttons with Counter */
    .rm-control-btn--skip {
      position: relative;
      width: 30px;
      height: 30px;
      background: transparent;
      margin: 0;
      padding: 0;
      line-height: 1;
    }

    .rm-control-btn--skip:hover {
      background: transparent;
      transform: scale(1.03);
    }

    .rm-control-btn--skip svg {
      margin-top: -2px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
    }

    .rm-control-btn--skip-back:hover {
      background: transparent;
    }

    .rm-control-btn--skip-forward:hover {
      background: transparent;
    }
    /* Volume Controls Container */
    .rm-volume-container {
      position: relative;
      display: flex;
      align-items: center;
      gap: 2px;
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      overflow: visible;
    }

    .rm-volume-slider-container {
      position: absolute;
      left: 50%;
      bottom: 52px;
      transform: translateX(-50%) rotate(-90deg);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
      background: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      z-index: 100;
    }

    .rm-volume-slider-container--visible {
      opacity: 1;
      pointer-events: all;
    }

    .rm-volume-slider {
      width: 60px;
      height: 4px;
      -webkit-appearance: none;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    }

    .rm-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid rgba(0, 0, 0, 0.3);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
      transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
    }

    .rm-volume-slider::-webkit-slider-thumb:hover {
      transform: scale(1.05);
      background: rgba(255, 255, 255, 1);
    }

    /* Time Display */
    .rm-time-display {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 4px;
      color: rgba(255, 255, 255, 0.92);
      font-size: 14px;
      font-weight: 500;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      letter-spacing: 0.2px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    .rm-time-separator {
      opacity: 0.6;
      margin: 0 2px;
    }

    /* Special button styling for specific controls */
    .rm-control-btn--captions,
    .rm-control-btn--settings {
      opacity: 0.8;
    }

    .rm-control-btn--captions:hover,
    .rm-control-btn--settings:hover {
      opacity: 1;
    }

    .rm-control-btn--fullscreen {
      background: transparent;
    }

    .rm-control-btn--fullscreen:hover {
      background: transparent;
    }

    /* Settings Menu with Apple Glassmorphism */
    .rm-settings-container {
      position: relative;
    }

    /* Ensure settings menu stays within viewport on smaller screens */
    @media (max-width: 320px) {
      .rm-settings-menu {
        right: -20px;
        width: 180px;
      }
    }

    @media (max-width: 280px) {
      .rm-settings-menu {
        right: -10px;
        width: 160px;
      }
    }

    .rm-control-btn--active {
      background: rgba(0, 122, 255, 0.2) !important;
      color: rgba(255, 255, 255, 0.98) !important;
    }

    /* Tooltip Styles */
    .rm-control-btn[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.95);
      color: rgba(255, 255, 255, 0.98);
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
      z-index: 10000;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      letter-spacing: -0.01em;
      border: 0.5px solid rgba(255, 255, 255, 0.15);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 2px 8px rgba(0, 0, 0, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.15);
      animation: tooltipFadeIn 0.2s cubic-bezier(0.23, 1, 0.32, 1);
      max-width: 200px;
      text-align: center;
    }

    /* Position for custom tooltips */
    .rm-control-btn[data-tooltip] {
      position: relative;
    }

    /* Add padding for leftmost tooltips */
    .rm-video-player__controls-left .rm-control-btn[data-tooltip]:hover::after {
      margin-left: 15px;
    }

    /* Add padding for rightmost tooltips */
    .rm-video-player__controls-right .rm-control-btn[data-tooltip]:hover::after {
      margin-right: 15px;
    }

    .rm-control-btn[data-tooltip]:hover::before {
      content: '';
      position: absolute;
      bottom: calc(100% + 2px);
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid rgba(0, 0, 0, 0.95);
      z-index: 10001;
      pointer-events: none;
    }

    @keyframes tooltipFadeIn {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }

    .rm-settings-menu {
      position: absolute;
      bottom: 40px;
      right: -10px;
      width: 200px;
      max-width: calc(100vw - 20px);
      max-height: 280px;
      background: rgba(0, 0, 0, 0.9);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      font-size: 14px;
      color: white;
    }

    @keyframes settingsSlideIn {
      0% {
        opacity: 0;
        transform: translateY(10px) scale(0.95);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .rm-settings-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      transition: background-color 0.2s;
    }

    .rm-settings-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .rm-settings-item:last-child {
      border-bottom: none;
    }

    .rm-settings-value {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin-right: 8px;
    }

    .rm-settings-arrow {
      width: 16px;
      height: 16px;
      opacity: 0.7;
    }

    .rm-settings-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-weight: 500;
    }

    .rm-settings-back {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      margin-right: 12px;
      padding: 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .rm-settings-back:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .rm-settings-back svg {
      width: 16px;
      height: 16px;
    }

    .rm-settings-option {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      position: relative;
    }

    .rm-settings-option:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .rm-settings-option--active {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .rm-settings-option--active::after {
      content: '✓';
      position: absolute;
      right: 16px;
      font-size: 14px;
      color: white;
    }

    /* Fullscreen enhancements */
    .rm-video-player--fullscreen .rm-video-player__controls {
      padding: 0px 16px 3px;
      border-radius: 0;
    }

    /* Caption/Subtitle Styling */
    video::cue {
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      font-size: 16px;
      font-weight: 500;
      line-height: 1.4;
      padding: 4px 8px;
      border-radius: 4px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    }

    .rm-video-player--fullscreen video::cue {
      font-size: 20px;
      padding: 6px 12px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RmNgVideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;

  private destroyRef = inject(DestroyRef);

  // Input signals
  @Input() set videoConfig(config: Partial<VideoPlayerConfig>) {
    this.config.set({ ...this.defaultConfig, ...config });
  }

  @Input() set videoSources(sources: VideoSource[]) {
    this.sources.set(sources);
    if (sources.length > 0) {
      this.currentSource.set(sources[0]);
    }
  }

  // Output events
  @Output() playerEvent = new EventEmitter<VideoPlayerEvent>();
  @Output() stateChange = new EventEmitter<VideoPlayerState>();

  // Signals
  config = signal<VideoPlayerConfig>(this.defaultConfig);
  sources = signal<VideoSource[]>([]);
  currentSource = signal<VideoSource | null>(null);

  // Player state signals
  isPlaying = signal(false);
  isLoading = signal(false);
  hasError = signal(false);
  errorMessage = signal<string>('');
  currentTime = signal(0);
  duration = signal(0);
  volume = signal(1);
  isMuted = signal(false);
  isFullscreen = signal(false);
  bufferedRanges = signal<TimeRanges | null>(null);
  playbackSpeed = signal(1);

  // UI state signals
  showControls = signal(true);
  showVolumeSlider = signal(false);
  showCaptions = signal(false);
  showSettingsMenu = signal(false);
  currentSettingsPanel = signal<string | null>(null);
  currentQuality = signal('auto');
  sleepTimer = signal<number | null>(null);
  sleepTimerActive = signal(false);

  loopEnabled = signal(false);
  private controlsTimer: number | null = null;
  private sleepTimerInstance: number | null = null;

  // Computed signals
  state = computed<VideoPlayerState>(() => ({
    isPlaying: this.isPlaying(),
    isLoading: this.isLoading(),
    hasError: this.hasError(),
    currentTime: this.currentTime(),
    duration: this.duration(),
    volume: this.volume(),
    isMuted: this.isMuted(),
    isFullscreen: this.isFullscreen(),
    bufferedRanges: this.bufferedRanges(),
  }));

  private get defaultConfig(): VideoPlayerConfig {
    return {
      autoplay: false,
      loop: false,
      muted: false,
      playsinline: true,
      preload: 'metadata',
      replayOnEnd: false,
      showControls: true,
      showFullscreenButton: true,
      showVolumeButton: true,
      showProgressBar: true,
      showRetryButton: true,
      hideControlsDelay: 3000,
      seekStep: 10,
      volumeStep: 0.1,
    };
  }

  constructor(private elementRef: ElementRef) {
    // Effect to emit state changes
    effect(() => {
      this.stateChange.emit(this.state());
    });

    // Effect to handle fullscreen changes
    effect(() => {
      if (this.isFullscreen()) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as Element;
    const playerElement = this.elementRef.nativeElement;

    if (playerElement && !playerElement.contains(target)) {
      if (this.showSettingsMenu()) {
        this.showSettingsMenu.set(false);
        this.currentSettingsPanel.set(null);
      }
    }
  }

  ngOnInit(): void {
    // Initialize signals from config
    this.loopEnabled.set(this.config().loop);

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer);
    }

    if (this.sleepTimerInstance) {
      clearTimeout(this.sleepTimerInstance);
    }

    // Cleanup fullscreen state
    if (this.isFullscreen()) {
      document.body.style.overflow = '';
    }
  }

  private setupEventListeners(): void {
    const video = this.videoElement.nativeElement;

    // Fullscreen change events
    merge(
      fromEvent(document, 'fullscreenchange'),
      fromEvent(document, 'webkitfullscreenchange'),
      fromEvent(document, 'mozfullscreenchange'),
      fromEvent(document, 'MSFullscreenChange')
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const isFullscreen = !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        );
        this.isFullscreen.set(isFullscreen);
      });

    // Mouse movement for controls
    fromEvent(video, 'mousemove')
      .pipe(throttleTime(100), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.showControlsTemporarily();
      });
  }

  private setupKeyboardShortcuts(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => {
        // Skip if user is typing in an input field
        if (this.isInputFocused()) return;

        switch (event.code) {
          case 'Space':
            event.preventDefault();
            this.togglePlayPause();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            this.seek(this.currentTime() - this.config().seekStep);
            break;
          case 'ArrowRight':
            event.preventDefault();
            this.seek(this.currentTime() + this.config().seekStep);
            break;
          case 'ArrowUp':
            event.preventDefault();
            this.setVolume(Math.min(1, this.volume() + this.config().volumeStep));
            break;
          case 'ArrowDown':
            event.preventDefault();
            this.setVolume(Math.max(0, this.volume() - this.config().volumeStep));
            break;
          case 'KeyJ':
            event.preventDefault();
            this.seek(this.currentTime() - 10); // Skip backward 10s
            break;
          case 'KeyL':
            event.preventDefault();
            this.seek(this.currentTime() + 10); // Skip forward 10s
            break;
          case 'KeyM':
            event.preventDefault();
            this.toggleMute();
            break;
          case 'KeyC':
            event.preventDefault();
            this.toggleCaptions();
            break;
          case 'KeyI':
            event.preventDefault();
            this.togglePictureInPicture();
            break;
          case 'KeyF':
            event.preventDefault();
            this.toggleFullscreen();
            break;
        }
      });
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const inputTypes = ['input', 'textarea', 'select'];
    const isContentEditable = activeElement.getAttribute('contenteditable') === 'true';

    return inputTypes.includes(tagName) || isContentEditable;
  }

  // Video event handlers
  onLoadStart(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.emitEvent('loadstart');
  }

  onLoadedMetadata(): void {
    const video = this.videoElement.nativeElement;
    this.duration.set(video.duration);
    this.initializeCaptions();
    this.emitEvent('loadedmetadata');
  }

  onLoadedData(): void {
    this.isLoading.set(false);
    this.emitEvent('loadeddata');
  }

  onCanPlay(): void {
    this.isLoading.set(false);
    this.emitEvent('canplay');
  }

  onCanPlayThrough(): void {
    this.emitEvent('canplaythrough');
  }

  onPlay(): void {
    this.isPlaying.set(true);
    this.emitEvent('play');
  }

  onPause(): void {
    this.isPlaying.set(false);
    this.emitEvent('pause');
  }

  onEnded(): void {
    this.isPlaying.set(false);
    this.emitEvent('ended');

    // Check if loop is enabled and restart video manually as fallback
    if (this.loopEnabled()) {
      const video = this.videoElement.nativeElement;

      // Reset video position immediately
      video.currentTime = 0;

      // Try to play the video
      video
        .play()
        .then(() => {
          this.isPlaying.set(true);
        })
        .catch(error => {
          // Silently handle loop restart failure
        });
    } else if (this.config().replayOnEnd) {
      // If replayOnEnd is enabled but loop is not, restart once
      const video = this.videoElement.nativeElement;

      // Reset video position immediately
      video.currentTime = 0;

      // Try to play the video once
      video
        .play()
        .then(() => {
          this.isPlaying.set(true);
        })
        .catch(error => {
          // Silently handle replay failure
        });
    }
  }

  onTimeUpdate(): void {
    const video = this.videoElement.nativeElement;
    this.currentTime.set(video.currentTime);
    this.emitEvent('timeupdate');
  }

  onProgress(): void {
    const video = this.videoElement.nativeElement;
    this.bufferedRanges.set(video.buffered);
    this.emitEvent('progress');
  }

  onVolumeChange(): void {
    const video = this.videoElement.nativeElement;
    this.volume.set(video.volume);
    this.isMuted.set(video.muted);
    this.emitEvent('volumechange');
  }

  onError(event: ErrorEvent): void {
    this.isLoading.set(false);
    this.hasError.set(true);
    this.errorMessage.set('Failed to load video. Please try again.');
    this.emitEvent('error', { error: event });
  }

  // Control methods
  togglePlayPause(): void {
    const video = this.videoElement.nativeElement;
    if (this.isPlaying()) {
      video.pause();
    } else {
      video.play().catch(error => {
        this.onError(error);
      });
    }
    this.showControlsTemporarily();
  }

  seek(time: number): void {
    const video = this.videoElement.nativeElement;
    const clampedTime = Math.max(0, Math.min(time, this.duration()));
    video.currentTime = clampedTime;
    this.currentTime.set(clampedTime);
    this.showControlsTemporarily();
  }

  setVolume(volume: number): void {
    const video = this.videoElement.nativeElement;
    const clampedVolume = Math.max(0, Math.min(1, volume));
    video.volume = clampedVolume;
    this.volume.set(clampedVolume);
    if (clampedVolume > 0 && this.isMuted()) {
      this.toggleMute();
    }
    this.showControlsTemporarily();
  }

  toggleMute(): void {
    const video = this.videoElement.nativeElement;
    video.muted = !video.muted;
    this.isMuted.set(video.muted);
    this.showControlsTemporarily();
  }

  toggleFullscreen(): void {
    if (this.isFullscreen()) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen(): void {
    const element = this.videoElement.nativeElement.parentElement;
    if (!element) return;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  }

  private exitFullscreen(): void {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  retry(): void {
    this.hasError.set(false);
    this.errorMessage.set('');
    const video = this.videoElement.nativeElement;
    video.load();
  }

  // YouTube-style control methods
  skipBackward(): void {
    const video = this.videoElement.nativeElement;
    const newTime = Math.max(0, this.currentTime() - 10);
    video.currentTime = newTime;
    this.currentTime.set(newTime);
    this.showControlsTemporarily();
  }

  skipForward(): void {
    const video = this.videoElement.nativeElement;
    const newTime = Math.min(this.duration(), this.currentTime() + 10);
    video.currentTime = newTime;
    this.currentTime.set(newTime);
    this.showControlsTemporarily();
  }

  private initializeCaptions(): void {
    const video = this.videoElement.nativeElement;
    const textTracks = video.textTracks;

    if (textTracks.length > 0) {
      // Set all caption/subtitle tracks to hidden initially
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          track.mode = this.showCaptions() ? 'showing' : 'hidden';
        }
      }
    }
  }

  toggleCaptions(): void {
    const video = this.videoElement.nativeElement;
    const textTracks = video.textTracks;

    // Toggle the internal state
    const newCaptionState = !this.showCaptions();
    this.showCaptions.set(newCaptionState);

    if (textTracks.length > 0) {
      // Find caption or subtitle tracks
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          // Set track mode based on caption state
          track.mode = newCaptionState ? 'showing' : 'hidden';
        }
      }
    }

    this.showControlsTemporarily();
  }

  toggleSettings(): void {
    this.showSettingsMenu.set(!this.showSettingsMenu());
    this.showControlsTemporarily();
  }

  closeSettings(): void {
    this.showSettingsMenu.set(false);
  }

  setPlaybackSpeed(speed: number): void {
    const video = this.videoElement.nativeElement;
    video.playbackRate = speed;
    this.playbackSpeed.set(speed);
    this.showControlsTemporarily();
  }

  openSettingsPanel(panel: string): void {
    this.currentSettingsPanel.set(panel);
  }

  closeSettingsPanel(): void {
    this.currentSettingsPanel.set(null);
  }

  changeQuality(quality: string): void {
    this.currentQuality.set(quality);
  }

  changeVideoSource(source: VideoSource): void {
    const currentTime = this.videoElement.nativeElement.currentTime;
    const wasPlaying = this.isPlaying();

    // Change to the new source
    this.currentSource.set(source);

    // Preserve playback position and state
    setTimeout(() => {
      this.videoElement.nativeElement.currentTime = currentTime;
      if (wasPlaying) {
        this.videoElement.nativeElement.play();
      }
    }, 100);

    this.closeSettings();
    this.showControlsTemporarily();
  }

  getSpeedLabel(): string {
    const speed = this.playbackSpeed();
    return speed === 1 ? 'Normal' : `${speed}`;
  }

  getQualityLabel(): string {
    const currentSource = this.currentSource();
    if (currentSource && currentSource.label) {
      return currentSource.label;
    }
    return 'Auto';
  }

  setSleepTimer(minutes: number | null): void {
    // Clear existing timer
    if (this.sleepTimerInstance) {
      clearTimeout(this.sleepTimerInstance);
      this.sleepTimerInstance = null;
    }

    if (minutes === null) {
      this.sleepTimer.set(null);
      this.sleepTimerActive.set(false);
      return;
    }

    this.sleepTimer.set(minutes);
    this.sleepTimerActive.set(true);

    // Set timer to pause video after specified minutes
    this.sleepTimerInstance = window.setTimeout(
      () => {
        if (this.isPlaying()) {
          this.togglePlayPause();
        }
        this.sleepTimerActive.set(false);
      },
      minutes * 60 * 1000
    );
    this.showControlsTemporarily();
  }

  getSleepTimerLabel(): string {
    if (!this.sleepTimerActive()) return 'Off';
    const minutes = this.sleepTimer();
    if (!minutes) return 'Off';

    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes === 60) {
      return '1 hour';
    } else if (minutes === 90) {
      return '1.5 hours';
    } else {
      return `${minutes / 60} hours`;
    }
  }

  toggleLoop(): void {
    const newLoopState = !this.loopEnabled();

    this.loopEnabled.set(newLoopState);

    // Update the config to keep it in sync
    const currentConfig = this.config();
    this.config.set({ ...currentConfig, loop: newLoopState });

    // Also update video element directly as backup
    const video = this.videoElement.nativeElement;
    video.loop = newLoopState;

    // If enabling loop and video is at the end, restart immediately
    if (newLoopState && video.ended) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise) {
        playPromise
          .then(() => {
            this.isPlaying.set(true);
          })
          .catch(error => {
            // Silently handle loop test failure
          });
      }
    }
    this.showControlsTemporarily();
  }

  togglePictureInPicture(): void {
    const video = this.videoElement.nativeElement;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => {
        // Silently handle picture-in-picture failure
      });
    }
    this.showControlsTemporarily();
  }

  // UI methods
  onMouseEnter(): void {
    this.showControlsTemporarily();
  }

  onMouseLeave(): void {
    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer);
    }
    this.showControls.set(false);
  }

  private showControlsTemporarily(): void {
    this.showControls.set(true);

    if (this.controlsTimer) {
      clearTimeout(this.controlsTimer);
    }

    this.controlsTimer = window.setTimeout(() => {
      if (this.isPlaying()) {
        this.showControls.set(false);
      }
    }, this.config().hideControlsDelay);
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  private emitEvent(type: string, data?: any): void {
    this.playerEvent.emit({ type, data, timestamp: Date.now() });
  }
}
