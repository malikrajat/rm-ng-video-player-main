import { Component, signal } from '@angular/core';
import { VERSION } from '@angular/core';
import { RmNgVideoPlayerComponent } from '../../projects/rm-ng-video-player/src/lib/rm-ng-video-player';
import {
  VideoSource,
  VideoPlayerConfig,
} from '../../projects/rm-ng-video-player/src/lib/interfaces/video-player.interface';

@Component({
  selector: 'app-root',
  imports: [RmNgVideoPlayerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('RM-NG Video Player Demo');
  protected readonly angularVersion = VERSION.full;

  // Premium video sources
  protected readonly videoSources: VideoSource[] = [
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video/mp4',
      label: '4K',
    },
    {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video/mp4',
      label: 'HD',
    },
  ];

  // Apple-style video configuration
  protected readonly videoConfig: VideoPlayerConfig = {
    autoplay: false,
    loop: false,
    muted: false,
    playsinline: true,
    preload: 'metadata',
    showControls: true,
    showFullscreenButton: true,
    showVolumeButton: true,
    showProgressBar: true,
    showRetryButton: true,
    hideControlsDelay: 2500,
    seekStep: 10,
    volumeStep: 0.1,
    replayOnEnd: true,
    poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&h=675&fit=crop',
    tracks: [
      {
        src: './sample-captions.vtt',
        kind: 'subtitles',
        srclang: 'en',
        label: 'English Subtitles',
        default: true,
      },
    ],
  };

  // Handle player events
  protected onPlayerEvent(event: any) {
    // Event handler for video player events
  }

  protected readonly exampleCode = `import { RmNgVideoPlayerComponent } from 'rm-ng-video-player';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [RmNgVideoPlayerComponent],
  template: \`
    <rm-ng-video-player
      [videoSources]="sources"
      [videoConfig]="config"
      (playerEvent)="onPlayerEvent($event)">
    </rm-ng-video-player>
  \`
})
export class ExampleComponent {
  sources = [
    { url: 'video.mp4', type: 'video/mp4' },
    { url: 'video.webm', type: 'video/webm' }
  ];

  config = {
    autoplay: false,
    loop: false,
    muted: false,
    playsinline: true,
    preload: 'metadata',
    showControls: true,
    showFullscreenButton: true,
    showVolumeButton: true,
    showProgressBar: true,
    showRetryButton: true,
    hideControlsDelay: 2500,
    seekStep: 10,
    volumeStep: 0.1,
    replayOnEnd: true,
    poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&h=675&fit=crop',
    tracks: [
      {
        src: './sample-captions.vtt',
        kind: 'subtitles',
        srclang: 'en',
        label: 'English Subtitles',
        default: true
      }
    ]
  };
}`;
}
