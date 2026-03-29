import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class WatchlistService {
  private apiUrl = environment.apiUrl + '/watchlist';

  constructor(private http: HttpClient) {}

  getWatchlist(page: number = 0, size: number = 10, search: string) {
    let params = new HttpParams().set('page', page).set('size', size);

    if (search) {
      params = params.set('search', search);
    }
    return this.http.get(this.apiUrl, { params });
  }

  addToWatchlist(videoId: number | string) {
    return this.http.post(this.apiUrl + '/' + videoId, {});
  }

  removeFromWatchlist(videoId: number | string) {
    return this.http.delete(this.apiUrl + '/' + videoId);
  }
}
