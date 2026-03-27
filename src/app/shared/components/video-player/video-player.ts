import { DialogRef } from '@angular/cdk/dialog';
import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  viewChild,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UtilityService } from '../../services/utility-service';
import { MediaService } from '../../services/media-service';

@Component({
  selector: 'app-video-player',
  standalone: false,
  templateUrl: './video-player.html',
  styleUrl: './video-player.css',
})
export class VideoPlayer implements OnInit, OnDestroy {
  @ViewChild('videoPlayer', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  isPlaying = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  isMuted = false;
  isFullscreen = false;
  showControls = true;
  controlsTimeout: any;
  private boundFullscreenHandler: any;
  private boundKeydownHandler: any;
  authenticationVideoUrl: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<VideoPlayer>,
    @Inject(MAT_DIALOG_DATA) public video: any,
    public utilityService: UtilityService,
    private mediaService: MediaService,
  ) {
    this.boundFullscreenHandler = this.onFullscreenChange.bind(this);
    this.boundKeydownHandler = this.onKeyDown.bind(this);

    this.loadAuthenticatedVideo();
  }

  ngOnInit(): void {
    this.startControlsTimer();

    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('keydown', this.boundKeydownHandler);

    this.dialogRef.beforeClosed().subscribe(() => {
      this.cleanup;
    });
  }

  ngOnDestroy(): void {}

  private loadAuthenticatedVideo(): void {
    this.authenticationVideoUrl = this.mediaService.getMediaUrl(this.video.src, 'video');
  }

  private cleanup() {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }

    document.removeEventListener('fullscreenchange', this.boundFullscreenHandler);
    document.removeEventListener('keydown', this.boundKeydownHandler);

    if (this.videoElement?.nativeElement) {
      const video = this.videoElement.nativeElement;
      video.pause();
      video.currentTime = 0;
      video.src = '';
      video.load();
      this.isPlaying = false;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case ' ':
      case 'k':
        event.preventDefault();
        this.togglePlay();
        break;
      case 'arrowleft':
        event.preventDefault();
        this.seekBackward();
        break;
      case 'arrowright':
        event.preventDefault();
        this.seekForward();
        break;
      case 'arrowup':
        event.preventDefault();
        this.increaseVolume();
        break;
      case 'arrowdown':
        event.preventDefault();
        this.decreaseVolume();
        break;
      case 'm':
        event.preventDefault();
        this.toggleMute();
        break;
      case 'f':
        event.preventDefault();
        this.toggleFullscreen();
        break;
      case 'escape':
        if (document.fullscreenElement) {
          event.preventDefault();
          document.exitFullscreen();
        } else {
          this.closePlayer();
        }
        break;
    }
  }

  onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  onLoadedMetadata() {
    if (this.videoElement?.nativeElement) {
      this.duration = this.videoElement.nativeElement.duration;
    }
  }

  onTimeUpdate() {
    if (this.videoElement?.nativeElement) {
      this.currentTime = this.videoElement.nativeElement.currentTime;
    }
  }

  onMouseMove() {
    this.showControls = true;
    this.startControlsTimer();
  }

  onVideoClick() {
    this.togglePlay();
  }

  onProgressClick(event: MouseEvent) {
    if (!this.videoElement?.nativeElement || !this.duration) return;
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const post = (event.clientX - rect.left) / rect.width;
    const newTime = post * this.duration;

    this.videoElement.nativeElement.currentTime = newTime;
    this.currentTime = newTime;
  }

  togglePlay() {
    if (!this.videoElement?.nativeElement) return;
    const video = this.videoElement.nativeElement;

    if (video.paused) {
      this.pauseAllOtherVideos(video);
      video
        .play()
        .then(() => {
          this.isPlaying = true;
        })
        .catch((err) => {
          console.error('Play error:', err);
          this.isPlaying = false;
        });
    } else {
      video.pause();
      this.isPlaying = false;
    }
  }

  private pauseAllOtherVideos(currentVideo: HTMLVideoElement) {
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach((video: HTMLVideoElement) => {
      if (video !== currentVideo && !video.paused) {
        video.pause();
      }
    });
  }

  seekForward() {
    if (!this.videoElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  }

  seekBackward() {
    if (!this.videoElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    video.currentTime = Math.max(0, video.currentTime - 10);
  }

  toggleMute() {
    if (!this.videoElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    video.muted = !video.muted;
    this.isMuted = video.muted;
  }

  changeVolume(event: Event) {
    if (!this.videoElement?.nativeElement) return;

    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value);

    this.setVolume(value);
    this.isMuted = this.volume === 0;
  }

  increaseVolume() {
    if (!this.videoElement?.nativeElement) return;

    const newVolume = Math.min(1, this.volume + 0.1);
    this.setVolume(newVolume);
    this.isMuted = false;
    this.videoElement.nativeElement.muted = false;
  }

  decreaseVolume() {
    if (!this.videoElement?.nativeElement) return;

    const newVolume = Math.max(0, this.volume - 0.1);
    this.setVolume(newVolume);
    this.videoElement.nativeElement.muted = false;
  }

  private setVolume(value: number) {
    if (!this.videoElement?.nativeElement) return;

    const video = this.videoElement.nativeElement;
    video.volume = value;
    this.volume = value;
  }

  toggleFullscreen() {
    const container = document.querySelector('.player-container');
    if (!document.fullscreenElement) {
      container?.requestFullscreen();
      this.isFullscreen = true;
    } else {
      document.exitFullscreen();
      this.isFullscreen = false;
    }
  }

  startControlsTimer() {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
    }
    this.controlsTimeout = setTimeout(() => {
      if (this.isPlaying) {
        this.showControls = false;
      }
    }, 3000);
  }

  closePlayer() {
    this.dialogRef.close();
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';

    // ปัดเศษทศนิยมทิ้งทั้งหมด
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    // เติมเลข 0 ข้างหน้าถ้าเป็นเลขหลักเดียว (เช่น 05:09)
    const paddedM = m.toString().padStart(2, '0');
    const paddedS = s.toString().padStart(2, '0');

    if (h > 0) {
      return `${h}:${paddedM}:${paddedS}`;
    }
    return `${paddedM}:${paddedS}`;
  }

  get videoSrc(): string | null {
    return this.authenticationVideoUrl;
  }

  get progressPercent(): number {
    return this.duration ? (this.currentTime / this.duration) * 100 : 0;
  }

  get volumePercent() {
    return this.volume * 100;
  }
}
