import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../models/auth.model';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';
import { ProfilePicutre } from '../profile-picutre/profile-picutre';
@Component({
  selector: 'app-header',
  imports: [RouterLink, ProfilePicutre],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  currentUser = signal<User | null>(null);
  authService = inject(AuthService);
  authSubscription!: Subscription
  router = inject(Router)

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
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.authSubscription.unsubscribe();
  }
}
