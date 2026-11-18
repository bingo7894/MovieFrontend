import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string, duration: number = 4000) {
    this.open(message, duration, 'notification-success');
  }

  error(message: string, duration: number = 5000) {
    this.open(message, duration, 'notification-error');
  }

  info(message: string, duration: number = 4000) {
    this.open(message, duration, 'notification-info');
  }

  private open(message: string, duration: number, panelClass: string) {
    this.snackBar.open(message, 'Close', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: [panelClass],
    });
  }
}
