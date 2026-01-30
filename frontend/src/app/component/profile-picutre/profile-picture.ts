import { Component, Input, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-profile-picture',
  imports: [RouterLink],
  templateUrl: './profile-picture.html',
  styleUrl: './profile-picture.scss',
})
export class ProfilePicture {
  @Input() profilePictureUrl: string | null = null;
  @Input() username: string = '';
  @Input() size: 'small' | 'medium' | 'large' | 'xlarge' = 'medium';
  @Input() showBorder: boolean = true;
  @Input() clickable: boolean = true;
  @Input() userId?: number;

  get sizeClass(): string {
    return `size-${this.size}`;
  }

  get defaultAvatar(): string {
    return 'assets/default-avatar.png';
  }

    get imageUrl(): string {
    if (this.profilePictureUrl) {
      return this.profilePictureUrl.startsWith('http')
        ? this.profilePictureUrl
        : `${environment.apiUrl}${this.profilePictureUrl}`;
    }
    return 'assets/default-avatar.png';
  }
}
