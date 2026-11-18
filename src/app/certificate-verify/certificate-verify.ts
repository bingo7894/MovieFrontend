import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { CertificateService } from '../shared/services/certificate-service';
import { UtilityService } from '../shared/services/utility-service';

@Component({
  selector: 'app-certificate-verify',
  standalone: false,
  templateUrl: './certificate-verify.html',
  styleUrl: './certificate-verify.css',
})
export class CertificateVerify implements OnInit {
  codeInput = '';
  loading = false;
  certificate: any = null;
  notFound = false;

  constructor(
    private route: ActivatedRoute,
    private certificateService: CertificateService,
    public utilityService: UtilityService,
  ) {}

  ngOnInit(): void {
    const paramCode = this.route.snapshot.paramMap.get('code') || '';
    if (paramCode) {
      this.codeInput = paramCode;
      this.verify();
    }
  }

  verify(): void {
    const code = this.codeInput.trim();
    if (!code) return;
    this.loading = true;
    this.certificate = null;
    this.notFound = false;

    this.certificateService
      .verifyCertificate(code)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.certificate = res;
        },
        error: () => {
          this.notFound = true;
        },
      });
  }
}
