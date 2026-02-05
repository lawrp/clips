import { Component, ElementRef, HostListener, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { OnInit } from '@angular/core';
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
export class Home implements OnInit {

  @ViewChild('sentinel', { read: ElementRef }) sentinel!: ElementRef

  clipService: ClipService = inject(ClipService);
  snackbarService: SnackbarService = inject(SnackbarService);
  router = inject(Router)

  clips = signal<Clip[]>([]);
  activeClips = signal<Set<number>>(new Set());
  isLoading = signal<boolean>(false);
  hasMore = signal<boolean>(true);

  private loadingMore = signal<boolean>(false);

  ngOnInit() {
    this.loadInitialClips();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    if (this.loadingMore() || !this.hasMore || this.isLoading()) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshhold = document.documentElement.scrollHeight - 500;

    if (scrollPosition >= threshhold) {
      this.loadingMore.set(true);
      this.loadMoreClips();
    }
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
        console.error('Failed to load feed:', err)
        this.snackbarService.show('Failed to load feed', 'error', 3000);
        this.isLoading.set(false);
      }
    });
  }

  loadMoreClips() {
    if (this.isLoading() || !this.hasMore()) return;

    this.isLoading.set(true);
    const lastClip = this.clips()[this.clips().length - 1]
    const cursor = lastClip?.id

    this.clipService.getFeed(cursor).subscribe({
      next: (newClips) => {
        this.clips.update(current => [...current, ...newClips]);
        this.isLoading.set(false);
        this.loadingMore.set(false);

        if (newClips.length < 5) {
          this.hasMore.set(false);
        }
      },
      error: (err) => {
        console.error('Failed to load more clips:', err);
        this.snackbarService.show('Failed to fetch more clips', 'error', 3000);
        this.isLoading.set(false);
        this.loadingMore.set(false);
      }
    });
  }

  activateClip(clipId: number) {
    this.activeClips.update(current => new Set(current).add(clipId));
  }

  navigateToClip(clipId: number) {
    this.router.navigate([`/clip/${clipId}`])
  }

}
