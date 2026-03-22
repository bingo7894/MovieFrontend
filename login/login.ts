import { ChangeDetectorRef, Component, ErrorHandler, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../shared/services/auth-service';
import { NotificationService } from '../shared/services/notification-service';
import { Router } from '@angular/router';
import { ErrorHandlerService } from '../shared/services/error-handler-service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  hide = true;
  loginForm!: FormGroup;
  loading = false;
  showResendLink = false;
  userEmail = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private notification: NotificationService,
    private errorHandlerService: ErrorHandlerService,
    private cdr: ChangeDetectorRef,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.authService.redirectBasedOnRole();
    }
  }

  submit() {
    this.loading = true;
    const formData = this.loginForm.value;
    const authData = {
      email: formData.email?.trim().toLowerCase(),
      password: formData.password,
    };

    this.authService.login(authData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.authService.redirectBasedOnRole();

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Login Failed. Please Cheack your credentials.';

        if (err.status === 403 && errorMsg.toLowerCase().includes('verify')) {
          this.showResendLink = true;
          this.userEmail = this.loginForm.value.email;
        } else {
          this.showResendLink = false;
        }
        this.notification.error(errorMsg);
        console.error('Login error:', err);

        this.cdr.detectChanges();
      },
    });
  }

  resendVerification() {
    if (!this.userEmail) {
      this.notification.error('Please enter your email address');
      return;
    }

    this.showResendLink = false;
    this.loading = true;
    this.authService.resendVerificationEmail(this.userEmail).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.notification.success(
          response.message || 'verification email sent! Please check your inbox.',
        );
      },
      error: (err) => {
        this.loading = false;
        this.errorHandlerService.handle(
          err,
          'Failed to send verification email. Please try again. ',
        );
      },
    });
  }

  forgot() {
    this.router.navigate(['forgot-password']);
  }
}
