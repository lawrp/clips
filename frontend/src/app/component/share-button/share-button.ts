import { Component, inject, Input } from '@angular/core';
import { Clip } from '../../models/clip.model';
import { SnackbarService } from '../../services/snackbar';

@Component({
  selector: 'app-share-button',
  imports: [],
  templateUrl: './share-button.html',
  styleUrl: './share-button.scss',
})
export class ShareButton {
  @Input() clip!: Clip
  @Input() showLabel: boolean = false;

  snackbarService: SnackbarService = inject(SnackbarService);

  shareClip() {
    const url = `${window.location.origin}/clip/${this.clip.id}`;

    if (navigator.share) {
      navigator.share({
        title: this.clip.title,
        text: `Check out this clip: ${this.clip.title}`,
        url: url
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          this.fallbackCopyToClipboard(url);
        }
      });
    } else {
      this.fallbackCopyToClipboard(url);
    }
  }

  private fallbackCopyToClipboard(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.snackbarService.show('Link copied to clipboard!', 'success', 3000);

    }).catch((error) => {
      console.error(error);
      this.snackbarService.show('Failed to copy link to clipboard!', 'error', 3000);
    })
  }
}
