import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private apiUrl = environment.apiUrl + '/admin/analytics';

  constructor(private http: HttpClient) {}

  getOverview() {
    return this.http.get(`${this.apiUrl}/overview`);
  }

  getCourseLearners(courseId: number | string) {
    return this.http.get(`${this.apiUrl}/courses/${courseId}/learners`);
  }

  exportCourseLearnersCsv(courseId: number | string) {
    return this.http.get(`${this.apiUrl}/courses/${courseId}/export`, {
      responseType: 'blob',
    });
  }
}
