import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth-service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('token');

  let request = req;
  if (token) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  } else {
    console.log('No token found,request sent without auth');
  }
  return next(request).pipe(
    catchError((error) => {
      if (error.status === 401 || error.status === 400) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
