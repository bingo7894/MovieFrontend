import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../shared/services/auth-service';

@Component({
  selector: 'app-verfy-email',
  standalone: false,
  templateUrl: './verfy-email.html',
  styleUrl: './verfy-email.css',
})
export class VerfyEmail implements OnInit {
  loading = true;
  success = false;
  message = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading = false;
      this.success = false;
      this.message = 'Invalid verification link, no token provided';
      return;
    }

    this.authService
      .verifyEmail(token)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: any) => {
          this.success = true;
          this.message = response.message || 'Email verified successfully!';
        },
        error: () => {
          this.success = false;
          this.message = 'Verification failed. The link may have expired or is invalid';
        },
      });
  }
}
