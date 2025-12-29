import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { inject } from '@angular/core';
import { firstValueFrom, map, skip, take, tap } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  authService.initializeAuth();

  return authService.isAuthenticated$.pipe(
    take(1),
    tap((isAuthed) => {
      console.log('Auth guard - authenticated:', isAuthed);
      if (!isAuthed) {
        router.navigate(['/login']);
      }
    })
  );
};