import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { User } from '../../models/auth.model';
import { Subscription, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Clip } from '../../models/clip.model';
import { ProfileService } from '../../services/profile';
import { ClipService } from '../../services/clip-service';
import { VideoPlayer } from '../../component/video-player/video-player';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, VideoPlayer],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit, OnDestroy {
  authService = inject(Auth);
  router = inject(Router);
  profileService = inject(ProfileService);
  clipService = inject(ClipService);

  user = signal<User | null>(null);
  profileSubscription!: Subscription

  totalClips = signal<number>(0);
  totalDuration = signal<number>(0);
  lastUpload = signal<string>('');

  clips = signal<Clip[]>([]);

  @Input() username: string = '';

  ngOnInit() {
    console.log('Username is: ', this.username)
    this.profileSubscription = this.profileService.getProfileData(this.username).pipe(
      tap(user => this.user.set(user)),
      switchMap(user => this.clipService.getClipsByUserId(user.id))
    ).subscribe({
      next: (clips) => this.clips.set(clips),
      error: (e) => console.error(`Error fetching clips... ${e}`)
    });
      
  }

  ngOnDestroy() {
    this.profileSubscription.unsubscribe();
  }
}
