import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // 1. เพิ่ม Import
import { ActivatedRoute } from '@angular/router';
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
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading = false;
      this.success = false;
      this.message = 'Invalid verfication link, Notoken provided';
      this.cdr.detectChanges();
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response: any) => {
        console.log('Success!', response);
        this.loading = false;
        this.success = true;
        this.message = response.message || 'Email verified sucessfully!';

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error!', err);
        this.loading = false;
        this.success = false;
        this.message = 'Verification failed. the link may have expired or is invalid';

        this.cdr.detectChanges();
      },
    });
  }
}
