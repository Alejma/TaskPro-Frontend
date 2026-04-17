import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.model';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] as Role[] | undefined) ?? [];
  const currentRole = authService.role();

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
