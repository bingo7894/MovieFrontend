import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../shared/services/auth-service';
import { NotificationService } from '../shared/services/notification-service';

@Component({
  selector: 'app-forgot-password',
  standalone: false,
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  forgotPasswordForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notification: NotificationService,
    private router: Router,
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  submit() {
    if (this.loading || this.forgotPasswordForm.invalid) return;
    this.loading = true;
    const email = this.forgotPasswordForm.value.email?.trim().toLowerCase();

    this.authService
      .forgotPassword(email)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.notification.success(response.message);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.notification.error(
            err.error?.error || 'Failed to send reset email. Please try again.',
          );
        },
      });
  }
}
