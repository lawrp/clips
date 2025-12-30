import { Component, ElementRef, inject, Input, signal, ViewChild } from '@angular/core';
import { ClipService } from '../../services/clip-service';

@Component({
  selector: 'app-video-player',
  imports: [],
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
})
export class VideoPlayer {
  @Input() clipId!: number;
  @Input() autoplay: boolean = false;
  @Input() controls: boolean = true;

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private clipService = inject(ClipService);

  isPlaying = signal<boolean>(false);
  showPlayButton = signal<boolean>(false);

  get videoUrl(): string {
    return this.clipService.getVideoUrl(this.clipId);
  }

  play() {
    this.videoElement.nativeElement.play();
    this.isPlaying.set(true);
    this.showPlayButton.set(false);
  }

  onVideoClick() {
    if (this.isPlaying()) {
      this.videoElement.nativeElement.pause();
      this.isPlaying.set(false);
      this.showPlayButton.set(true);
    } else {
      this.play();
    }
  }
}
