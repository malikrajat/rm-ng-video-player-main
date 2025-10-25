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
  selector: 'rm-video-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rm-video-progress">
      <div
        #progressBar
        class="rm-video-progress__bar"
        (click)="onProgressClick($event)"
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseleave)="onMouseLeave()"
        [attr.aria-label]="'Seek to ' + formatTime(hoverTime())"
      >
        <!-- Buffered progress -->
        @if (buffered && duration > 0) {
          @for (range of bufferedRanges(); track $index) {
            <div
              class="rm-video-progress__buffered"
              [style.left.%]="(range.start / duration) * 100"
              [style.width.%]="((range.end - range.start) / duration) * 100"
            ></div>
          }
        }

        <!-- Played progress -->
        <div class="rm-video-progress__played" [style.width.%]="progressPercentage()"></div>

        <!-- Hover preview -->
        @if (isHovering()) {
          <div class="rm-video-progress__hover-preview" [style.left.%]="hoverPercentage()">
            <div class="rm-video-progress__hover-time">
              {{ formatTime(hoverTime()) }}
            </div>
          </div>
        }

        <!-- Scrubber -->
        <div
          class="rm-video-progress__scrubber"
          [style.left.%]="progressPercentage()"
          [class.rm-video-progress__scrubber--dragging]="isDragging()"
        ></div>
      </div>
    </div>
  `,
  styles: `
    .rm-video-progress {
      position: relative;
      width: 100%;
      height: 24px;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 10px 0;
    }

    .rm-video-progress__bar {
      position: relative;
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 2px;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .rm-video-progress:hover .rm-video-progress__bar {
      height: 5px;
      background: rgba(255, 255, 255, 0.25);
    }

    .rm-video-progress__buffered {
      position: absolute;
      top: 0;
      height: 100%;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      transition: background 0.3s ease;
    }

    .rm-video-progress__played {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, #ffffff 0%, rgba(255, 255, 255, 0.8) 100%);
      border-radius: 2px;
      transition: width 0.1s ease;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
    }

    .rm-video-progress__scrubber {
      position: absolute;
      top: 50%;
      width: 14px;
      height: 14px;
      background: #ffffff;
      backdrop-filter: blur(10px) saturate(180%);
      -webkit-backdrop-filter: blur(10px) saturate(180%);
      border: 2px solid rgba(255, 255, 255, 0.8);
      border-radius: 50%;
      transform: translateX(-50%) translateY(-50%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.5);
      cursor: grab;
    }

    .rm-video-progress:hover .rm-video-progress__scrubber,
    .rm-video-progress__scrubber--dragging {
      opacity: 1;
    }

    .rm-video-progress__scrubber--dragging {
      transform: translateX(-50%) translateY(-50%) scale(1.2);
      cursor: grabbing;
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .rm-video-progress__hover-preview {
      position: absolute;
      bottom: 100%;
      transform: translateX(-50%);
      margin-bottom: 8px;
      pointer-events: none;
    }

    .rm-video-progress__hover-time {
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .rm-video-progress__hover-time::after {
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
      .rm-video-progress {
        height: 24px;
      }

      .rm-video-progress__bar {
        height: 6px;
      }

      .rm-video-progress:hover .rm-video-progress__bar {
        height: 8px;
      }

      .rm-video-progress__scrubber {
        width: 16px;
        height: 16px;
      }
    }

    /* Touch devices */
    @media (pointer: coarse) {
      .rm-video-progress {
        height: 28px;
      }

      .rm-video-progress__bar {
        height: 8px;
      }

      .rm-video-progress__scrubber {
        width: 18px;
        height: 18px;
        opacity: 1;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoProgressComponent {
  @ViewChild('progressBar', { static: true }) progressBar!: ElementRef<HTMLDivElement>;

  @Input() currentTime = 0;
  @Input() duration = 0;
  @Input() buffered: TimeRanges | null = null;

  @Output() seek = new EventEmitter<number>();

  // Signals
  isDragging = signal(false);
  isHovering = signal(false);
  hoverX = signal(0);

  // Computed signals
  progressPercentage = computed(() => {
    if (this.duration <= 0) return 0;
    return (this.currentTime / this.duration) * 100;
  });

  hoverPercentage = computed(() => {
    if (!this.progressBar) return 0;
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    return (this.hoverX() / rect.width) * 100;
  });

  hoverTime = computed(() => {
    const percentage = this.hoverPercentage();
    return (percentage / 100) * this.duration;
  });

  bufferedRanges = computed(() => {
    if (!this.buffered || this.duration <= 0) return [];

    const ranges = [];
    for (let i = 0; i < this.buffered.length; i++) {
      ranges.push({
        start: this.buffered.start(i),
        end: this.buffered.end(i),
      });
    }
    return ranges;
  });

  onProgressClick(event: MouseEvent): void {
    if (this.isDragging()) return;

    const seekTime = this.getSeekTimeFromEvent(event);
    this.seek.emit(seekTime);
  }

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);

    const seekTime = this.getSeekTimeFromEvent(event);
    this.seek.emit(seekTime);

    const handleMouseMove = (e: MouseEvent) => {
      const seekTime = this.getSeekTimeFromEvent(e);
      this.seek.emit(seekTime);
    };

    const handleMouseUp = () => {
      this.isDragging.set(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  onMouseMove(event: MouseEvent): void {
    if (this.isDragging()) return;

    this.isHovering.set(true);
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    this.hoverX.set(event.clientX - rect.left);
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  private getSeekTimeFromEvent(event: MouseEvent): number {
    const rect = this.progressBar.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * this.duration;
  }

  formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
