import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.development';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.apiUrl + '/users';

  constructor(private http: HttpClient) {}

  getAllUsers(page: number, size: number, search?: string) {
    let params = new HttpParams().set('page', page).set('size', size);

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get(this.apiUrl, { params });
  }

  createUser(user: any) {
    return this.http.post(this.apiUrl, user);
  }

  getUserById(id: number) {
    return this.http.get(this.apiUrl + '/' + id);
  }

  updateUser(id: number, user: any) {
    return this.http.put(this.apiUrl + '/' + id, user);
  }

  deleteUser(id: number) {
    return this.http.delete(this.apiUrl + '/' + id);
  }

  toggleUserStatus(id: number) {
    return this.http.put(this.apiUrl + '/' + id + '/toggle-status', {});
  }

  changeUserRole(id: number, role: string) {
    return this.http.put(this.apiUrl + '/' + id + '/change-role', { role });
  }
}
