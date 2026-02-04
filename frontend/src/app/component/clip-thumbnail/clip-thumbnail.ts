import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Clip } from '../../models/clip.model';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-clip-thumbnail',
  imports: [],
  templateUrl: './clip-thumbnail.html',
  styleUrl: './clip-thumbnail.scss',
})
export class ClipThumbnail {
  @Input() clip!: Clip;
  @Output() play = new EventEmitter<void>();

  apiUrl = environment.apiUrl;

  get thumbnailUrl(): string | null {
    return this.clip.thumbnail_path ? `${this.apiUrl}/${this.clip.thumbnail_path}` : null;
  }

  onPlay(event: MouseEvent): void {
    event.stopPropagation();
    this.play.emit();
  }
}
