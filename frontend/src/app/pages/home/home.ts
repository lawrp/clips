import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { ClipService } from '../../services/clip-service';
import { Clip } from '../../models/clip.model';
import { SnackbarService } from '../../services/snackbar';
import { VideoPlayer } from '../../component/video-player/video-player';
import { ClipThumbnail } from '../../component/clip-thumbnail/clip-thumbnail';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [VideoPlayer, ClipThumbnail, DatePipe],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('sentinel', { read: ElementRef }) sentinel!: ElementRef;

  clipService: ClipService = inject(ClipService);
  snackbarService: SnackbarService = inject(SnackbarService);
  router = inject(Router);

  clips = signal<Clip[]>([]);
  activeClips = signal<Set<number>>(new Set());
  isLoading = signal<boolean>(false);
  hasMore = signal<boolean>(true);

  private observer?: IntersectionObserver;

  noApproval = signal<boolean>(false);

  ngOnInit() {
    this.loadInitialClips();
  }

  loadInitialClips() {
    this.isLoading.set(true);
    this.clipService.getFeed().subscribe({
      next: (clips) => {
        this.clips.set(clips);
        this.isLoading.set(false);
        if (clips.length < 5) {
          this.hasMore.set(false);
        }
      },
      error: (err) => {
        if (err.status === 403) {
          this.snackbarService.show('You are not approved to see clips. Ask for approval.', 'info', 3000);
          this.isLoading.set(false);
          this.noApproval.set(true);
        } else {
          console.error('Failed to load feed:', err);
          this.snackbarService.show('Failed to load feed', 'error', 3000);
          this.isLoading.set(false);
        }
      },
    });
  }

  loadMoreClips() {
    if (this.isLoading() || !this.hasMore()) return;

    const currentClips = this.clips();
    if (currentClips.length === 0) return;

    const cursor = currentClips[currentClips.length - 1].id;
    this.isLoading.set(true);

    this.clipService.getFeed(cursor).subscribe({
      next: (newClips) => {
        this.clips.update((current) => [...current, ...newClips]);
        this.isLoading.set(false);
        if (newClips.length < 5) {
          this.hasMore.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load more clips:', err);
        this.snackbarService.show('Failed to fetch more clips', 'error', 3000);
        this.isLoading.set(false);
      },
    });
  }

  setupIntersectionObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          this.loadMoreClips();
        }
      },
      { threshold: 0.1 },
    );

    if (this.sentinel) {
      this.observer.observe(this.sentinel.nativeElement);
    }
  }

  activateClip(clipId: number) {
    this.activeClips.update((current) => new Set(current).add(clipId));
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  navigateToClip(clipId: number) {
    this.router.navigate([`/clip/${clipId}`]);
  }
}
