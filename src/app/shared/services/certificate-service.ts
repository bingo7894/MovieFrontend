import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CertificateService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  issueOrGetCertificate(courseId: number | string) {
    return this.http.post(`${this.apiUrl}/courses/${courseId}/certificate`, {});
  }

  getMyCertificates() {
    return this.http.get(`${this.apiUrl}/certificates/my`);
  }

  verifyCertificate(code: string) {
    return this.http.get(`${this.apiUrl}/certificates/verify/${encodeURIComponent(code.trim())}`);
  }
}
