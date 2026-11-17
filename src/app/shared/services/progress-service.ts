import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  updateEpisodeProgress(episodeId: number | string, data: { watchedSeconds?: number; completed?: boolean }) {
    return this.http.post(`${this.apiUrl}/progress/episodes/${episodeId}`, data);
  }

  enrollCourse(courseId: number | string) {
    return this.http.post(`${this.apiUrl}/enrollments/${courseId}`, {});
  }

  unenrollCourse(courseId: number | string) {
    return this.http.delete(`${this.apiUrl}/enrollments/${courseId}`);
  }

  getEnrolledCourses(page: number = 0, size: number = 10, search?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return this.http.get(`${this.apiUrl}/enrollments`, { params });
  }

  getNotes(episodeId: number | string) {
    return this.http.get(`${this.apiUrl}/notes/episodes/${episodeId}`);
  }

  createNote(episodeId: number | string, data: { timestampSeconds: number; content: string }) {
    return this.http.post(`${this.apiUrl}/notes/episodes/${episodeId}`, data);
  }

  deleteNote(noteId: number | string) {
    return this.http.delete(`${this.apiUrl}/notes/${noteId}`);
  }
}
