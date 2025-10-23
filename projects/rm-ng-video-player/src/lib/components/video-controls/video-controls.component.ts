import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rm-video-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rm-video-controls">
      <button
        class="rm-video-controls__button rm-video-controls__play-pause"
        (click)="onPlayPause()"
        [attr.aria-label]="isPlaying ? 'Pause' : 'Play'"
      >
        @if (isPlaying) {
          <svg class="rm-video-controls__icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        } @else {
          <svg class="rm-video-controls__icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        }
      </button>

      @if (showFullscreen) {
        <button
          class="rm-video-controls__button rm-video-controls__fullscreen"
          (click)="onFullscreen()"
          [attr.aria-label]="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
        >
          @if (isFullscreen) {
            <svg class="rm-video-controls__icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
              />
            </svg>
          } @else {
            <svg class="rm-video-controls__icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
              />
            </svg>
          }
        </button>
      }
    </div>
  `,
  styles: `
    .rm-video-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rm-video-controls__button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      color: white;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      position: relative;
      overflow: hidden;
    }

    .rm-video-controls__button::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.08) 0%,
        transparent 50%,
        rgba(255, 255, 255, 0.04) 100%
      );
      border-radius: 50%;
      pointer-events: none;
    }

    .rm-video-controls__button:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: scale(1.1);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }

    .rm-video-controls__button:active {
      transform: scale(0.95);
      background: rgba(255, 255, 255, 0.15);
    }

    .rm-video-controls__button:focus {
      outline: none;
    }

    .rm-video-controls__button:focus-visible {
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
    }

    .rm-video-controls__play-pause {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.08);
    }

    .rm-video-controls__play-pause:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: scale(1.05);
    }

    .rm-video-controls__icon {
      width: 18px;
      height: 18px;
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    }

    .rm-video-controls__play-pause .rm-video-controls__icon {
      width: 22px;
      height: 22px;
    }

    @media (max-width: 480px) {
      .rm-video-controls {
        gap: 4px;
      }

      .rm-video-controls__button {
        width: 36px;
        height: 36px;
      }

      .rm-video-controls__play-pause {
        width: 44px;
        height: 44px;
      }

      .rm-video-controls__icon {
        width: 18px;
        height: 18px;
      }

      .rm-video-controls__play-pause .rm-video-controls__icon {
        width: 22px;
        height: 22px;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoControlsComponent {
  @Input() isPlaying = false;
  @Input() isFullscreen = false;
  @Input() showFullscreen = true;

  @Output() playPause = new EventEmitter<void>();
  @Output() fullscreen = new EventEmitter<void>();

  onPlayPause(): void {
    this.playPause.emit();
  }

  onFullscreen(): void {
    this.fullscreen.emit();
  }
}
