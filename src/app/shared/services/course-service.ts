import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private apiUrl = environment.apiUrl + '/courses';
  private adminUrl = environment.apiUrl + '/admin/courses';

  constructor(private http: HttpClient) {}

  getPublishedCourses(page: number = 0, size: number = 10, search?: string, category?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);
    return this.http.get(this.apiUrl, { params });
  }

  getFeaturedCourses() {
    return this.http.get(this.apiUrl + '/featured');
  }

  getInProgressCourses() {
    return this.http.get(this.apiUrl + '/in-progress');
  }

  getCourseDetail(courseId: number | string) {
    return this.http.get(`${this.apiUrl}/${courseId}`);
  }

  getAllAdminCourses(page: number = 0, size: number = 10, search?: string) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return this.http.get(this.adminUrl, { params });
  }

  getAdminCourseDetail(courseId: number | string) {
    return this.http.get(`${this.adminUrl}/${courseId}`);
  }

  getAdminStats() {
    return this.http.get(`${this.adminUrl}/stats`);
  }

  createCourse(data: any) {
    return this.http.post(this.adminUrl, data);
  }

  updateCourse(courseId: number | string, data: any) {
    return this.http.put(`${this.adminUrl}/${courseId}`, data);
  }

  togglePublish(courseId: number | string, published: boolean) {
    return this.http.patch(`${this.adminUrl}/${courseId}/publish`, null, {
      params: new HttpParams().set('value', published),
    });
  }

  deleteCourse(courseId: number | string) {
    return this.http.delete(`${this.adminUrl}/${courseId}`);
  }
}
