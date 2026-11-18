import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../shared/services/auth-service';
import { NotificationService } from '../shared/services/notification-service';
import { ErrorHandlerService } from '../shared/services/error-handler-service';

@Component({
  selector: 'app-signup',
  standalone: false,
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup implements OnInit {
  hidePassword = true;
  hideConfirmPassword = true;
  signupForm!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private notification: NotificationService,
    private errorHandlerService: ErrorHandlerService,
  ) {
    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [
        '',
        [Validators.required, this.authService.passwordMatchValidator('password')],
      ],
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.authService.redirectBasedOnRole();
    }

    const email = this.route.snapshot.queryParams['email'];
    if (email) {
      this.signupForm.patchValue({ email });
    }
  }

  submit() {
    if (this.loading || this.signupForm.invalid) return;
    this.loading = true;
    const formData = this.signupForm.value;
    const data = {
      email: formData.email?.trim().toLowerCase(),
      password: formData.password,
      fullname: formData.fullName,
    };

    this.authService
      .signup(data)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.notification.success(response?.message || 'Registration successful!');
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.errorHandlerService.handle(err, 'Registration failed, please try again');
        },
      });
  }
}
