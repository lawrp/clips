import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { filter, map, switchMap, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return auth.authInitialized$.pipe(
    filter(Boolean),                 // wait until auth is ready
    switchMap(() => auth.isAuthenticated$),
    take(1),
    map(isAuthed => {
      console.log('Auth guard - authenticated:', isAuthed);
      return isAuthed ? true : router.createUrlTree(['/login']);
    })
  );
};