import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { User } from '../../models/auth.model';
import { reduce, Subscription, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Clip } from '../../models/clip.model';
import { ProfileService } from '../../services/profile';
import { ClipService } from '../../services/clip-service';
import { VideoPlayer } from '../../component/video-player/video-player';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, VideoPlayer, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  authService = inject(AuthService);
  router = inject(Router);
  profileService = inject(ProfileService);
  clipService = inject(ClipService);

  user = signal<User | null>(null);
  profileSubscription!: Subscription;

  totalClips = signal<number>(0);
  totalDuration = signal<number>(0);
  lastUpload = signal<Date | null>(null);

  clips = signal<Clip[]>([]);

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
          if (recentClip) {
            console.log('Recent clip uploaded_at:', recentClip.uploaded_at);
            console.log('As Date object:', new Date(recentClip.uploaded_at));
            console.log('Date toString:', new Date(recentClip.uploaded_at).toString());
          }

          this.lastUpload.set(recentClip ? new Date(recentClip.uploaded_at) : null);
        },
        error: (e) => console.error(`Error fetching clips... ${e}`),
      });
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
    this.profileSubscription.unsubscribe();
  }

  navigateToClip(id: number) {
    this.router.navigate([`clip/${id}`]);
  }
}
