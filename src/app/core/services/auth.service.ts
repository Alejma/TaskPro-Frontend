import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LoginRequest, LoginResponse, Role } from '../models/auth.model';

const API_URL = 'http://localhost:3000/api';
const TOKEN_KEY = 'taskpro_token';
const USER_KEY = 'taskpro_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly _userRaw = signal<string | null>(localStorage.getItem(USER_KEY));

  readonly token = computed(() => this._token());
  readonly user = computed(() => {
    const raw = this._userRaw();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LoginResponse['user'];
    } catch {
      return null;
    }
  });
  readonly isAuthenticated = computed(() => !!this._token());
  readonly role = computed<Role | null>(() => this.user()?.role ?? this.getRoleFromToken());

  login(payload: LoginRequest) {
    return this.http.post<unknown>(`${API_URL}/auth/login`, payload);
  }

  normalizeLoginResponse(response: unknown): LoginResponse | null {
    const raw = (response ?? {}) as Record<string, unknown>;
    const data = (raw['data'] ?? raw) as Record<string, unknown>;

    const token = (data['token'] ?? data['accessToken'] ?? raw['token'] ?? raw['accessToken']) as
      | string
      | undefined;
    const user = (data['user'] ?? raw['user']) as LoginResponse['user'] | undefined;

    if (!token || !user) return null;
    return { token, user };
  }

  saveSession(response: LoginResponse): void {
    const userRaw = JSON.stringify(response.user);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, userRaw);
    this._token.set(response.token);
    this._userRaw.set(userRaw);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._userRaw.set(null);
    this.router.navigate(['/auth/login']);
  }

  navigateByRole(role: Role | null): void {
    if (role === 'ADMIN') {
      this.router.navigate(['/users']);
      return;
    }
    if (role === 'GERENTE') {
      this.router.navigate(['/projects']);
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  private getRoleFromToken(): Role | null {
    const token = this._token();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64Url)) as { role?: Role };
      return payload.role ?? null;
    } catch {
      return null;
    }
  }
}
