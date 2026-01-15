import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommentsSection } from '../../component/comments-section/comments-section';
import { VideoPlayer } from '../../component/video-player/video-player';
import { ClipService } from '../../services/clip-service';
import { Clip } from '../../models/clip.model';
import { SnackbarService } from '../../services/snackbar';

@Component({
  selector: 'app-clip',
  standalone: true,
  imports: [CommentsSection, VideoPlayer],
  templateUrl: './clip.html',
  styleUrl: './clip.scss'
})
export class ClipPage implements OnInit {
  @Input() id!: string; // Route param comes in as string

  clip = signal<Clip | null>(null);

  clipService: ClipService = inject(ClipService);
  snackbarService: SnackbarService = inject(SnackbarService);
  
  get clipId(): number {
    return +this.id;
  }



  ngOnInit() {
    this.clipService.getClipById(this.clipId).subscribe({
      next: (clip) => {
        this.clip.set(clip);
      },
      error: (err) => {
        console.error(err);
        this.snackbarService.show('There was an error fetching the clip details...', 'error', 3000);
      }
    })
  }
}