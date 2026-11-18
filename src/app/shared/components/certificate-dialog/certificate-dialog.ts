import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UtilityService } from '../../services/utility-service';
import { NotificationService } from '../../services/notification-service';

@Component({
  selector: 'app-certificate-dialog',
  standalone: false,
  templateUrl: './certificate-dialog.html',
  styleUrl: './certificate-dialog.css',
})
export class CertificateDialog {
  certificate: any;

  constructor(
    public dialogRef: MatDialogRef<CertificateDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public utilityService: UtilityService,
    private notification: NotificationService,
  ) {
    this.certificate = data?.certificate;
  }

  copyCode(): void {
    if (!this.certificate?.certificateCode) return;
    navigator.clipboard?.writeText(this.certificate.certificateCode);
    this.notification.success('Certificate code copied');
  }

  printCertificate(): void {
    window.print();
  }

  close(): void {
    this.dialogRef.close();
  }
}
