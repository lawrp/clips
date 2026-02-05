// video-player.component.ts
import { Component, Input, ViewChild, ElementRef, inject } from '@angular/core';
import { ClipService } from '../../services/clip-service';
import { VolumeService } from '../../services/volume-service';
import { effect } from '@angular/core';
import { AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-video-player',
  imports: [],
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
})
export class VideoPlayer implements AfterViewInit {
  @Input() clipId!: number;
  @Input() autoplay: boolean = false;
  @Input() controls: boolean = true;

  volumeService = inject(VolumeService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  private clipService = inject(ClipService);

  constructor() {
    effect(() => {
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.volume = this.volumeService.volume();
      }
    });
  }

  get videoUrl(): string {
    return this.clipService.getVideoUrl(this.clipId);
  }

  ngAfterViewInit() {
    if (this.videoElement) {
      this.videoElement.nativeElement.volume = this.volumeService.volume();
    }
  }

  onVolumeChange(event: Event) {
    const target = event.target as HTMLVideoElement;
    this.volumeService.setVolume(target.volume);
  }
}
