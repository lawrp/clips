import { Component, Input, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-profile-picutre',
  imports: [RouterLink],
  templateUrl: './profile-picutre.html',
  styleUrl: './profile-picutre.scss',
})
export class ProfilePicutre implements OnInit, OnChanges {
  @Input() profilePictureUrl: string | null = null;
  @Input() username: string = '';
  @Input() size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium';
  @Input() showBorder: boolean = true;
  @Input() clickable: boolean = true;
  @Input() userId?: number;

  imageUrl = signal<string>('');

  ngOnChanges(changes: SimpleChanges) {
    console.log('Changes are being detected!!!');
    if (changes['profilePictureUrl']) {
      this.updateImageUrl();
    }
  }

  ngOnInit() {
    this.updateImageUrl();
  }

  private updateImageUrl() {
    if (this.profilePictureUrl) {
      const fullUrl = this.profilePictureUrl.startsWith('http')
        ? this.profilePictureUrl
        : `${environment.apiUrl}${this.profilePictureUrl}`;
      this.imageUrl.set(fullUrl);
    } else {
      this.imageUrl.set('assets/default-avatar.png');
    }
  }

  get sizeClass(): string {
    return `size-${this.size}`;
  }

  get defaultAvatar(): string {
    return 'assets/default-avatar.png';
  }
}
