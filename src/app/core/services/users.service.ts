import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  getUsuarios(): Observable<{ id: string; name: string }[]> {
    return this.http.get<unknown>('http://localhost:3000/api/usuarios').pipe(
      map((response) => {
        let raw: unknown[] = [];
        if (Array.isArray(response)) {
          raw = response;
        } else {
          const obj = response as Record<string, unknown>;
          raw = (obj['data'] ?? obj['usuarios'] ?? []) as unknown[];
        }
        return raw
          .filter((item): item is Record<string, unknown> => item != null && typeof item === 'object')
          .map((item) => ({
            id: String(item['id'] ?? item['_id'] ?? ''),
            name: String(item['name'] ?? '')
          }))
          .filter((u) => !!u.id);
      })
    );
  }
}
