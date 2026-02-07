import { Component, inject,  signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../models/auth.model';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';
import { ProfilePicture } from '../profile-picutre/profile-picture';
import { AsyncPipe } from '@angular/common';
import { UserRole } from '../../models/roles.model';
@Component({
  selector: 'app-header',
  imports: [RouterLink, ProfilePicture, AsyncPipe],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  authService = inject(AuthService);
  router = inject(Router);

  UserRole = UserRole

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearUser();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Couldnt log out!', err);
        this.authService.clearUser();
        this.router.navigate(['/login']);
      }
    })
  }

}
