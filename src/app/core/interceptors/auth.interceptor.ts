import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const snackBar = inject(MatSnackBar);
  const token = authService.token();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        snackBar.open('Tu sesión expiró. Inicia sesión nuevamente.', 'Cerrar', {
          duration: 4000
        });
        authService.logout();
      } else {
        snackBar.open(error.error?.message ?? 'Error inesperado en la solicitud.', 'Cerrar', {
          duration: 4000
        });
      }
      return throwError(() => error);
    })
  );
};
