import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { StatusType, User } from '../../models/auth.model';
import { Subscription, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Clip } from '../../models/clip.model';
import { ProfileService } from '../../services/profile';
import { ClipService } from '../../services/clip-service';
import { VideoPlayer } from '../../component/video-player/video-player';
import { FormsModule } from '@angular/forms';
import { SnackbarService } from '../../services/snackbar';
import { environment } from '../../../environments/environment.development';
import { ClipThumbnail } from '../../component/clip-thumbnail/clip-thumbnail';
import { RouterLink } from '@angular/router';
import { UserRole } from '../../models/roles.model';
@Component({
  selector: 'app-profile',
  imports: [DatePipe, VideoPlayer, FormsModule, ClipThumbnail, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  profileService = inject(ProfileService);
  clipService = inject(ClipService);
  snackbarService = inject(SnackbarService);
  route = inject(ActivatedRoute);

  user = signal<User | null>(null);
  private profileSubscription?: Subscription;

  totalClips = signal<number>(0);
  totalDuration = signal<number>(0);
  lastUpload = signal<Date | null>(null);

  clips = signal<Clip[]>([]);

  sortOption: string = 'newest';

  isUploading = signal<boolean>(false);
  uploadProgress = signal<number>(0);
  statusMessage = signal<string>('');
  statusType = signal<StatusType>('success');

  isProfileOwner = signal<boolean>(false);

  activeClips = signal<Set<number>>(new Set());

  isLoading = signal<boolean>(true);
  notFound = signal<boolean>(false);

  UserRole = UserRole

  noApproval = signal<boolean>(false);

  ngOnInit() {
    this.profileSubscription = this.route.paramMap
      .pipe(
        tap(() => {
          this.user.set(null);
          this.clips.set([]);
          this.notFound.set(false);
          this.isLoading.set(true);
        }),
        switchMap((params) => {
          const username = params.get('username')!;
          return this.profileService.getProfileData(username);
        }),
        tap((user) => {
          this.user.set(user);
          this.checkIfOwner(user);
        }),
        switchMap((user) => this.clipService.getClipsByUserId(user.id)),
      )
      .subscribe({
        next: (clips) => {
          this.clips.set(clips);
          this.totalClips.set(this.getTotalClips(this.clips()));
          this.totalDuration.set(this.getWatchTime(this.clips()));
          const recentClip = this.getRecentDate(this.clips());
          this.lastUpload.set(recentClip ? new Date(recentClip.uploaded_at) : null);

          this.isLoading.set(false);
        },
        error: (e) => {
          this.isLoading.set(false);

          if (e.status === 404) {
            this.notFound.set(true);
            return;
          }
          if (e.status === 403) {
            this.snackbarService.show('You are not approved. Cannot fetch clips until approval.', 'info', 3000);
            this.noApproval.set(true);
            return;
          }
          this.snackbarService.show('There was an error loading this profile.', 'error', 3000);
        },
      });
    this.sortByNewest();
  }

  getTotalClips(clips: Clip[]) {
    return clips.length;
  }

  getWatchTime(clips: Clip[]) {
    return clips.reduce((total, video: Clip) => {
      return total + video.duration!;
    }, 0);
  }

  getRecentDate(clips: Clip[]) {
    if (clips.length === 0) return null;

    return clips.reduce((mostRecent, clip) => {
      return new Date(clip.uploaded_at) > new Date(mostRecent.uploaded_at) ? clip : mostRecent;
    });
  }

  ngOnDestroy() {
    this.profileSubscription?.unsubscribe();
  }

  navigateToClip(id: number) {
    this.router.navigate([`clip/${id}`]);
  }

  sortByNewest() {
    this.clips.set(
      [...this.clips()].sort(
        (clip1, clip2) =>
          new Date(clip2.uploaded_at).getTime() - new Date(clip1.uploaded_at).getTime(),
      ),
    );
  }

  sortByOldest() {
    this.clips.set(
      [...this.clips()].sort(
        (clip1, clip2) =>
          new Date(clip1.uploaded_at).getTime() - new Date(clip2.uploaded_at).getTime(),
      ),
    );
  }

  sortByLongest() {
    this.clips.set([...this.clips()].sort((clip1, clip2) => clip2.duration - clip1.duration));
  }

  sortByShortest() {
    this.clips.set([...this.clips()].sort((clip1, clip2) => clip1.duration - clip2.duration));
  }

  sortByValue() {
    if (this.sortOption === 'newest') {
      this.sortByNewest();
    } else if (this.sortOption === 'oldest') {
      this.sortByOldest();
    } else if (this.sortOption === 'shortest') {
      this.sortByShortest();
    } else if (this.sortOption === 'longest') {
      this.sortByLongest();
    }
  }

  handleDelete(clipId: number) {
    if (confirm('Are you sure you want to delete this clip? This cannot be undone.')) {
      this.clipService.deleteClipById(clipId).subscribe({
        next: () => {
          this.clips.set(this.clips().filter((clip) => clip.id != clipId));
          this.totalClips.set(this.getTotalClips(this.clips()));
          const recentClip = this.getRecentDate(this.clips());
          this.lastUpload.set(recentClip ? new Date(recentClip.uploaded_at) : null);

          this.snackbarService.show('Successfully deleted clip.', 'success', 3000);
        },
        error: (err) => {
          console.error(err);
          this.snackbarService.show('There was an error deleting this clip.', 'error', 3000);
        },
      });
    } else {
      return;
    }
  }

  handleUpdateProfilePicture() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';

    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.uploadProfilePicture(target.files[0]);
      }
    };

    fileInput.click();
  }

  uploadProfilePicture(file: File) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.statusMessage.set('Please select a valid image file (JPG, PNG, or WEBP)');
      this.statusType.set('error');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.statusMessage.set('File size must be less than 5MB');
      this.statusType.set('error');
      return;
    }

    this.isUploading.set(true);
    this.statusMessage.set('');

    this.profileService.uploadProfilePicture(file).subscribe({
      next: (user) => {
        this.isUploading.set(false);
        this.statusMessage.set('Profile picture updated successfully!');
        this.statusType.set('success');
        this.user.set(user);

        // Clear message after 3 seconds
        setTimeout(() => {
          this.statusMessage.set('');
        }, 3000);
      },
      error: (err) => {
        this.isUploading.set(false);
        this.statusMessage.set(err.error?.detail || 'Failed to upload profile picture');
        this.statusType.set('error');
        console.error('Error uploading profile picture', err);
      },
    });
  }

  deleteProfilePicture() {
    if (!confirm('Are you sure you want to delete your profile picture?')) {
      return;
    }

    this.profileService.deleteProfilePicture().subscribe({
      next: (res) => {
        this.statusMessage.set('Profile picture deleted successfully');
        this.statusType.set('success');

        // Update the user signal to remove profile picture
        const currentUser = this.user();
        if (currentUser) {
          this.user.set({
            ...currentUser,
            profile_picture_url: null,
          });
        }

        // Clear message after 3 seconds
        setTimeout(() => {
          this.statusMessage.set('');
        }, 3000);
      },
      error: (err) => {
        this.statusMessage.set('Failed to delete profile picture');
        this.statusType.set('error');
        console.error('Error deleting profile picture', err);
      },
    });
  }

  getFullImageUrl(pictureUrl: string | null): string {
    if (!pictureUrl) {
      return 'assets/default-avatar.png';
    }

    // If it's already a full URL, return it
    if (pictureUrl.startsWith('http')) {
      return pictureUrl;
    }

    // Otherwise, prepend the API URL
    return `${environment.apiUrl}${pictureUrl}`;
  }

  private checkIfOwner(user: User) {
    const currentUser = this.authService.currentUser();
    this.isProfileOwner.set(currentUser?.id === user.id);
  }

  activateClip(clipId: number) {
    this.activeClips.update((current) => new Set(current).add(clipId));
  }

  togglePrivacy(clipId: number) {
    const clip = this.clips().find(c => c.id === clipId);
    if (!clip) return;
    
    const newPrivateState = !clip.private;

    this.clipService.updateClipById({ private: newPrivateState }, clipId).subscribe({
      next: (updatedClip) => {
        this.clips.update(current =>
          current.map(c => c.id === clipId ? updatedClip : c)
        );
        this.snackbarService.show(`Clip is now ${newPrivateState ? 'private': 'public'}`, 'success', 3000);
      },
      error: (e) => {
        this.snackbarService.show('Failed to update privacy', 'error', 3000);
      }
    })
  }
}
