import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  createQuiz(episodeId: number | string, data: any) {
    return this.http.post(`${this.apiUrl}/admin/episodes/${episodeId}/quizzes`, data);
  }

  getAdminQuiz(quizId: number | string) {
    return this.http.get(`${this.apiUrl}/admin/quizzes/${quizId}`);
  }

  updateQuiz(quizId: number | string, data: any) {
    return this.http.put(`${this.apiUrl}/admin/quizzes/${quizId}`, data);
  }

  deleteQuiz(quizId: number | string) {
    return this.http.delete(`${this.apiUrl}/admin/quizzes/${quizId}`);
  }

  getQuiz(quizId: number | string) {
    return this.http.get(`${this.apiUrl}/quizzes/${quizId}`);
  }

  submitQuiz(quizId: number | string, answers: Record<number, number[]>) {
    return this.http.post(`${this.apiUrl}/quizzes/${quizId}/submit`, { answers });
  }

  getAttempts(quizId: number | string) {
    return this.http.get(`${this.apiUrl}/quizzes/${quizId}/attempts`);
  }
}
