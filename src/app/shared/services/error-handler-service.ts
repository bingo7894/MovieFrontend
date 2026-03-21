import { Injectable } from '@angular/core';
import { NotificationService } from './notification-service';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(private notification: NotificationService) {}
  handle(err: any, fallbackMessage: string) {
    const errorMsg = err.error?.error || fallbackMessage;
    this.notification.error(errorMsg);
    console.log('API Error', err);
  }
}
