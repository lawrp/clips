import { Component, inject, Input, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { User } from '../../models/auth.model';
import { reduce, Subscription, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Clip } from '../../models/clip.model';
import { ProfileService } from '../../services/profile';
import { ClipService } from '../../services/clip-service';
import { VideoPlayer } from '../../component/video-player/video-player';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SnackbarService } from '../../services/snackbar';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, VideoPlayer, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  profileService = inject(ProfileService);
  clipService = inject(ClipService);
  snackbarService = inject(SnackbarService);

  user = signal<User | null>(null);
  profileSubscription!: Subscription;

  totalClips = signal<number>(0);
  totalDuration = signal<number>(0);
  lastUpload = signal<Date | null>(null);

  clips = signal<Clip[]>([]);

  sortOption: string = 'newest';

  @Input() username: string = '';

  ngOnInit() {
    console.log('Username is: ', this.username);
    this.profileSubscription = this.profileService
      .getProfileData(this.username)
      .pipe(
        tap((user) => this.user.set(user)),
        switchMap((user) => this.clipService.getClipsByUserId(user.id))
      )
      .subscribe({
        next: (clips) => {
          console.table(clips);
          this.clips.set(clips);
          this.totalClips.set(this.getTotalClips(this.clips()));
          this.totalDuration.set(this.getWatchTime(this.clips()));
          const recentClip = this.getRecentDate(this.clips());
          this.lastUpload.set(recentClip ? new Date(recentClip.uploaded_at) : null);
        },
        error: (e) => console.error(`Error fetching clips... ${e}`),
      });
    this.sortByNewest();
  }

  getTotalClips(clips: Clip[]) {
    return clips.length;
  }

  get isProfileOwner() {
    const current_user = this.authService.currentUser();
    if (this.user() && current_user) {
      return this.user()!.id == current_user!.id
    } else {
      return false;
    }
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
    this.profileSubscription.unsubscribe();
  }

  navigateToClip(id: number) {
    this.router.navigate([`clip/${id}`]);
  }

  sortByNewest() {
    this.clips.set(
      [...this.clips()].sort(
        (clip1, clip2) =>
          new Date(clip2.uploaded_at).getTime() - new Date(clip1.uploaded_at).getTime()
      )
    );
  }

  sortByOldest() {
    this.clips.set(
      [...this.clips()].sort(
        (clip1, clip2) =>
          new Date(clip1.uploaded_at).getTime() - new Date(clip2.uploaded_at).getTime()
      )
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
}
