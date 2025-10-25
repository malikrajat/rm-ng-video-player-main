import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'rm-video-volume',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rm-video-volume">
      <button
        class="rm-video-volume__button"
        (click)="onToggleMute()"
        [attr.aria-label]="isMuted ? 'Unmute' : 'Mute'"
      >
        @if (isMuted || volume === 0) {
          <svg class="rm-video-volume__icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
            />
          </svg>
        } @else if (volume < 0.5) {
          <svg class="rm-video-volume__icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"
            />
          </svg>
        } @else {
          <svg class="rm-video-volume__icon" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            />
          </svg>
        }
      </button>

      <div
        class="rm-video-volume__slider-container"
        [class.rm-video-volume__slider-container--visible]="showSlider()"
      >
        <div
          #volumeSlider
          class="rm-video-volume__slider"
          (click)="onSliderClick($event)"
          (mousedown)="onSliderMouseDown($event)"
        >
          <div class="rm-video-volume__track"></div>

          <div class="rm-video-volume__fill" [style.height.%]="volumePercentage()"></div>

          <div
            class="rm-video-volume__thumb"
            [style.bottom.%]="volumePercentage()"
            [class.rm-video-volume__thumb--dragging]="isDragging()"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .rm-video-volume {
      position: relative;
      display: flex;
      align-items: center;
    }

    .rm-video-volume__button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(4px);
    }

    .rm-video-volume__button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }

    .rm-video-volume__button:active {
      transform: scale(0.95);
    }

    .rm-video-volume__button:focus {
      outline: 2px solid rgba(255, 255, 255, 0.8);
      outline-offset: 2px;
    }

    .rm-video-volume__icon {
      width: 20px;
      height: 20px;
      pointer-events: none;
    }

    .rm-video-volume__slider-container {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 4px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      pointer-events: none;
    }

    .rm-video-volume:hover .rm-video-volume__slider-container,
    .rm-video-volume__slider-container--visible {
      opacity: 1;
      visibility: visible;
      pointer-events: all;
    }

    .rm-video-volume__slider {
      position: relative;
      width: 4px;
      height: 80px;
      cursor: pointer;
    }

    .rm-video-volume__track {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
    }

    .rm-video-volume__fill {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      background: #ff4757;
      border-radius: 2px;
      transition: height 0.1s ease;
    }

    .rm-video-volume__thumb {
      position: absolute;
      left: 50%;
      width: 12px;
      height: 12px;
      background: #ff4757;
      border: 2px solid white;
      border-radius: 50%;
      transform: translateX(-50%) translateY(50%);
      transition: transform 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .rm-video-volume__thumb--dragging {
      transform: translateX(-50%) translateY(50%) scale(1.2);
    }

    /* Triangle pointer */
    .rm-video-volume__slider-container::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 4px solid rgba(0, 0, 0, 0.8);
    }

    @media (max-width: 480px) {
      .rm-video-volume__button {
        width: 36px;
        height: 36px;
      }

      .rm-video-volume__icon {
        width: 18px;
        height: 18px;
      }

      .rm-video-volume__slider {
        height: 60px;
      }
    }

    /* Touch devices - always show slider */
    @media (pointer: coarse) {
      .rm-video-volume__slider-container {
        position: static;
        transform: none;
        margin: 0 8px;
        padding: 4px;
        opacity: 1;
        visibility: visible;
        pointer-events: all;
        background: transparent;
      }

      .rm-video-volume__slider-container::after {
        display: none;
      }

      .rm-video-volume__slider {
        width: 60px;
        height: 4px;
      }

      .rm-video-volume__fill {
        width: auto;
        height: 100%;
        left: 0;
        bottom: 0;
      }

      .rm-video-volume__thumb {
        top: 50%;
        bottom: auto;
        left: auto;
        right: 0;
        transform: translateY(-50%) translateX(50%);
      }

      .rm-video-volume__thumb--dragging {
        transform: translateY(-50%) translateX(50%) scale(1.2);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoVolumeComponent {
  @ViewChild('volumeSlider', { static: false }) volumeSlider?: ElementRef<HTMLDivElement>;

  @Input() volume = 1;
  @Input() isMuted = false;

  @Output() volumeChange = new EventEmitter<number>();
  @Output() toggleMute = new EventEmitter<void>();

  // Signals
  isDragging = signal(false);
  showSlider = signal(false);

  // Computed signals
  volumePercentage = computed(() => {
    return this.isMuted ? 0 : this.volume * 100;
  });

  onToggleMute(): void {
    this.toggleMute.emit();
  }

  onSliderClick(event: MouseEvent): void {
    if (this.isDragging()) return;

    const newVolume = this.getVolumeFromEvent(event);
    this.volumeChange.emit(newVolume);
  }

  onSliderMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
    this.showSlider.set(true);

    const newVolume = this.getVolumeFromEvent(event);
    this.volumeChange.emit(newVolume);

    const handleMouseMove = (e: MouseEvent) => {
      const newVolume = this.getVolumeFromEvent(e);
      this.volumeChange.emit(newVolume);
    };

    const handleMouseUp = () => {
      this.isDragging.set(false);
      this.showSlider.set(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  private getVolumeFromEvent(event: MouseEvent): number {
    if (!this.volumeSlider) return this.volume;

    const rect = this.volumeSlider.nativeElement.getBoundingClientRect();
    const isHorizontal = window.matchMedia('(pointer: coarse)').matches;

    let percentage: number;

    if (isHorizontal) {
      // Horizontal slider for touch devices
      const x = event.clientX - rect.left;
      percentage = Math.max(0, Math.min(1, x / rect.width));
    } else {
      // Vertical slider for desktop
      const y = event.clientY - rect.top;
      percentage = Math.max(0, Math.min(1, 1 - y / rect.height));
    }

    return percentage;
  }
}
