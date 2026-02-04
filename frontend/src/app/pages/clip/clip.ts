import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { CommentsSection } from '../../component/comments-section/comments-section';
import { VideoPlayer } from '../../component/video-player/video-player';
import { ClipService } from '../../services/clip-service';
import { Clip, ClipLikeResponse, ClipUpdate } from '../../models/clip.model';
import { SnackbarService } from '../../services/snackbar';
import { AuthService } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { ProfilePicture } from '../../component/profile-picutre/profile-picture';
import { ProfileService } from '../../services/profile';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ShareButton } from '../../component/share-button/share-button';
@Component({
  selector: 'app-clip',
  standalone: true,
  imports: [CommentsSection, VideoPlayer, FormsModule, ProfilePicture, DatePipe, RouterLink, ShareButton],
  templateUrl: './clip.html',
  styleUrl: './clip.scss',
})
export class ClipPage implements OnInit {
  @Input() id!: string; // Route param comes in as string

  authService = inject(AuthService);
  profileService = inject(ProfileService);

  clip = signal<Clip | null>(null);

  clipService: ClipService = inject(ClipService);
  snackbarService: SnackbarService = inject(SnackbarService);
  editTitle = signal<boolean>(false);
  editDescription = signal<boolean>(false);
  user_has_liked = signal<boolean>(false);
  clipLikes = signal<number | null>(null);
  clipTitle = signal<string | null>(null);
  clipDescription = signal<string | null>(null);
  isSubmitting = signal<boolean>(false);

  tempTitle = signal<string>('');
  tempDescription = signal<string>('');

  uploaderProfilePic = signal<string | null>(null);
  uploaderUsername = signal<string | null>(null);

  isLoading = signal<boolean>(true);
  notFound = signal<boolean>(false);

  get clipId(): number {
    const id = Number(this.id);
    return Number.isNaN(id) ? -1 : id
  }

  get isClipOwner(): boolean {
    const user = this.authService.currentUser();
    const currentClip = this.clip();

    if (!user || !currentClip) {
      return false;
    }

    return user.id === currentClip.user_id;
  }

  ngOnInit() {
    this.clipService.getClipById(this.clipId).subscribe({
      next: (clip) => {
        this.clip.set(clip);
        this.clipLikes.set(clip.likes);
        this.user_has_liked.set(clip.user_has_liked);
        this.clipTitle.set(clip.title);
        this.clipDescription.set(clip.description);
        this.uploaderUsername.set(clip.username);

        this.profileService.getProfileData(clip.username).subscribe({
          next: (profile) => this.uploaderProfilePic.set(profile.profile_picture_url),
        });

        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);

        if (err.status === 404) {
          this.notFound.set(true);
          return;
        }

        this.snackbarService.show('There was an error fetching the clip details.', 'error', 3000);
      },
    });
  }

  onEditTitle() {
    this.editTitle.set(true);
  }

  onLikeClip() {
    this.clipService.likeClipById(this.clipId).subscribe({
      next: (response: ClipLikeResponse) => {
        this.clipLikes.set(response.likes);
        this.user_has_liked.set(response.user_has_liked);
      },
    });
  }

  cancelEditTitle() {
    this.editTitle.set(false);
  }

  postEditTitle() {
    const title = this.clipTitle();

    if (!title || !title.trim()) {
      this.snackbarService.show('Title cannot be empty', 'error', 3000);
      return;
    }

    this.isSubmitting.set(true);

    const clipUpdate: ClipUpdate = {
      title: title.trim(),
    };

    this.clipService.updateClipById(clipUpdate, this.clipId).subscribe({
      next: (updatedClip) => {
        this.clip.set(updatedClip);
        this.clipTitle.set(updatedClip.title);
        this.editTitle.set(false);
        this.isSubmitting.set(false);
        this.snackbarService.show('Title updated successfully!', 'success', 3000);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting.set(false);
        this.snackbarService.show('Error updating title:', 'error', 3000);
      },
    });
  }

  onEditDescription() {
    this.clipDescription.set(this.clip()!.description);
    this.editDescription.set(true);
  }

  postEditDescription() {
    const description = this.clipDescription();

    if (!description || !description.trim()) {
      this.snackbarService.show('Description cannot be empty', 'error', 3000);
      return;
    }

    this.isSubmitting.set(true);

    const clipUpdate: ClipUpdate = {
      description: description.trim(),
    };

    this.clipService.updateClipById(clipUpdate, this.clipId).subscribe({
      next: (updatedClip) => {
        this.clip.set(updatedClip);
        this.clipDescription.set(updatedClip.description);
        this.editDescription.set(false);
        this.isSubmitting.set(false);
        this.snackbarService.show('Description updated successfully!', 'success', 3000);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting.set(false);
        this.snackbarService.show('Error updating description:', 'error', 3000);
      },
    });
  }

  cancelEditDescription() {
    this.clipDescription.set(this.clip()?.description ?? null);
    this.editDescription.set(false);
  }
}
