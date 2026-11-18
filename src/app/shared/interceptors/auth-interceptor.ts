import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = localStorage.getItem('token');

  let request = req;
  if (token) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(request).pipe(
    catchError((error) => {
      if (error.status === 401) {
        authService.logout();
      } else if (error.status === 403 && req.url.includes('/api/admin/')) {
        authService.initializeAuth().then(() => {
          if (!authService.isLoggedIn()) {
            authService.logout();
          } else if (!authService.isAdmin() && router.url.startsWith('/admin')) {
            router.navigate(['/home']);
          }
        });
      }
      return throwError(() => error);
    }),
  );
};
