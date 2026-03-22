import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { BehaviorSubject, retry, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl + '/auth';

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  passwordMatchValidator(passwordControlName: string): ValidatorFn {
    return (confirmControl: AbstractControl): ValidationErrors | null => {
      if (!confirmControl.parent) return null;
      const password = confirmControl.parent.get(passwordControlName)?.value;
      const confirmPassword = confirmControl.value;
      return password === confirmPassword ? null : { passwordMismatch: true };
    };
  }

  signup(signupData: any) {
    return this.http.post(this.apiUrl + '/signup', signupData);
  }

  verifyEmail(token: string) {
    return this.http.get(this.apiUrl + '/verify-email?token=' + token);
  }

  login(loginData: any) {
    return this.http
      .post(this.apiUrl + '/login', loginData)
      .pipe(tap((response) => this.handlerAuthSucces(response)));
  }

  handlerAuthSucces(authData: any) {
    if (!authData) {
      this.setCurrent(null);
      return;
    }

    if (authData.token) {
      localStorage.setItem('token', authData.token);
    }

    const userData = authData.user ? authData.user : authData;

    this.setCurrent(userData);
  }

  setCurrent(user: any | null) {
    this.currentUserSubject.next(user);
  }

  getCurrentUser() {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  redirectBasedOnRole() {
    const targetUrl = this.isAdmin() ? '/admin' : '/home';
    this.router.navigate([targetUrl]);
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN';
  }

  resendVerificationEmail(email: string) {
    return this.http.post(this.apiUrl + '/resend-verification', { email });
  }

  forgotPassword(email: string) {
    return this.http.post(this.apiUrl + '/forgot-password', { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post(this.apiUrl + '/reset-password', { token, newPassword });
  }

  initializeAuth(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLoggedIn()) {
        this.handlerAuthSucces(null);
        resolve();
        return;
      }

      this.fetchCurrentUser().subscribe({
        next: (user) => {
          this.handlerAuthSucces(user);
          resolve();
        },
        error: () => {
          this.handlerAuthSucces(null);
          resolve();
        },
      });
    });
  }

  private fetchCurrentUser() {
    return this.http.get(this.apiUrl + '/current-user');
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }

  changePassword(changePasswordData: any) {
    return this.http.post(this.apiUrl + '/change-password', changePasswordData);
  }
}
