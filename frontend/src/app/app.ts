import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { filter, Subscription } from 'rxjs';
import { Header } from './component/header/header';
import { Snackbar } from './component/snackbar/snackbar';
import { NoAuthHeader } from './component/no-auth-header/no-auth-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Snackbar, NoAuthHeader],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('ClipHub');
  authService = inject(AuthService);
  router = inject(Router);
  isAuthenticated = signal<boolean>(false);
  showNoAuthHeader = signal<boolean>(false);
  authSubscription!: Subscription
  routerSubscription!: Subscription

  private readonly AUTH_PAGES = ['/login', '/register', '/recover', '/reset-password'];

  ngOnInit() {
    this.authService.initializeAuth();

    this.authSubscription = this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {
        this.isAuthenticated.set(isAuth);
        this.updateHeaderVisibility();
      },
      error: (e) => {
        console.error('There was an error', e);
      }
    });

    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateHeaderVisibility();
    })
  }

  private updateHeaderVisibility() {
    const currentUrl = this.router.url.split('?')[0];
    const isAuthPage = this.AUTH_PAGES.some(page => currentUrl.startsWith(page));

    this.showNoAuthHeader.set(!this.isAuthenticated() && !isAuthPage);
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
    this.routerSubscription.unsubscribe();
  }
}
