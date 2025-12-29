import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { map, take, tap } from 'rxjs';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  auth.initializeAuth();

  return auth.isAuthenticated$.pipe(
    take(1),
    map((isAuthed) => !isAuthed),
    tap((canEnter) => {
      console.log('Guest guard - can enter:', canEnter);
      if (!canEnter) {
        router.navigate(['/dashboard']);
      }
    })
  );
};