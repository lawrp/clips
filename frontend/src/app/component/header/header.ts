import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { User } from '../../models/auth.model';
import { Auth } from '../../services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  currentUser = signal<User | null>(null);
  authService = inject(Auth);
  authSubscription!: Subscription

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser.set(user);
      },
      error: (e) => {
        console.error('Error setting currentUser!', e);
      }
    })
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
