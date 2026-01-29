import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { UserRole } from '../models/roles.model';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser()

  if (currentUser && currentUser.role === UserRole.ADMIN) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
