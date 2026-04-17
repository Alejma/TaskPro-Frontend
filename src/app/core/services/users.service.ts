import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { User, UserPayload } from '../models/user.model';

const API_URL = 'http://localhost:3000/api/users';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(API_URL);
  }

  createUser(payload: UserPayload): Observable<User> {
    return this.http.post<User>(API_URL, payload);
  }

  updateUser(id: string, payload: UserPayload): Observable<User> {
    return this.http.put<User>(`${API_URL}/${id}`, payload);
  }

  toggleUserStatus(id: string, active: boolean): Observable<User> {
    return this.http.patch<User>(`${API_URL}/${id}/status`, { isActive: active });
  }
}
