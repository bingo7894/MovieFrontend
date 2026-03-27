import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class VideoService {
  private apiUrl = environment.apiUrl + '/videos';
  private apiUrlAdmin = environment.apiUrl + '/videos/admin';

  constructor(private http: HttpClient) {}

  getAllAdminVideos(page: number, size: number, search?: string) {
    let params = new HttpParams().set('page', page).set('size', size);

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get(this.apiUrlAdmin, { params });
  }

  createVideoByAdmin(data: any) {
    return this.http.post(this.apiUrlAdmin, data);
  }

  updateVideoByAdmin(id: string | number, data: any) {
    return this.http.put(this.apiUrlAdmin + '/' + id, data);
  }

  deleteVideoByAdmin(id: string | number) {
    return this.http.delete(this.apiUrlAdmin + '/' + id);
  }

  setPublishedByAdmin(id: string | number, published: boolean) {
    const payload = { published: published };
    return this.http.patch(this.apiUrlAdmin + '/' + id, payload);
  }

  getStatsByAdmin() {
    return this.http.get(this.apiUrlAdmin + '/stats');
  }

  getPublishedVideoPaginated(page: number = 0, size: number = 10, search?: string) {
    let params = new HttpParams().set('page', page).set('size', size);

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get(this.apiUrl + '/published', { params });
  }

  getFratureVideo() {
    return this.http.get(this.apiUrl + '/featured');
  }
}
