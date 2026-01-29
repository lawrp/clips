import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { Subscription } from 'rxjs';
import { Header } from './component/header/header';
import { Snackbar } from './component/snackbar/snackbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Snackbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Clip Champ');
  authService = inject(AuthService);
  isAuthenticated = signal<boolean>(false);
  authSubscription!: Subscription

  ngOnInit() {
    this.authService.initializeAuth();

    this.authSubscription = this.authService.isAuthenticated$.subscribe({
      next: (isAuth) => {
        this.isAuthenticated.set(isAuth);
        console.log('Auth has been set to: ', this.isAuthenticated());
      },
      error: (e) => {
        console.error('There was an error', e);
      }
    })
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
