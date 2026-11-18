import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCourseReviews(courseId: number | string) {
    return this.http.get(`${this.apiUrl}/courses/${courseId}/reviews`);
  }

  upsertReview(courseId: number | string, data: { rating: number; comment: string }) {
    return this.http.post(`${this.apiUrl}/courses/${courseId}/reviews`, data);
  }

  deleteReview(reviewId: number | string) {
    return this.http.delete(`${this.apiUrl}/reviews/${reviewId}`);
  }
}
