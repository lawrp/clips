// video-player.component.ts
import { Component, Input, ViewChild, ElementRef, inject } from '@angular/core';
import { ClipService } from '../../services/clip-service';

@Component({
  selector: 'app-video-player',
  imports: [],
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss'
})
export class VideoPlayer {
  @Input() clipId!: number;
  @Input() autoplay: boolean = false;
  @Input() controls: boolean = true;
  
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  private clipService = inject(ClipService);
  
  get videoUrl(): string {
    return this.clipService.getVideoUrl(this.clipId);
  }
}