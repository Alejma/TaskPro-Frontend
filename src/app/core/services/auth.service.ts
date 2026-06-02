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
      const parsed = JSON.parse(raw) as LoginResponse['user'];
      return {
        ...parsed,
        role: this.normalizeRole(parsed.role) ?? parsed.role
      };
    } catch {
      return null;
    }
  });
  readonly isAuthenticated = computed(() => !!this._token());
  readonly role = computed<Role | null>(() =>
    this.normalizeRole(this.user()?.role ?? this.getRoleFromToken())
  );

  login(payload: LoginRequest) {
    return this.http.post<unknown>(`${API_URL}/auth/login`, payload);
  }

  normalizeLoginResponse(response: unknown): LoginResponse | null {
    const raw = (response ?? {}) as Record<string, unknown>;
    const data = (raw['data'] ?? raw) as Record<string, unknown>;

    const token = (data['token'] ?? data['accessToken'] ?? raw['token'] ?? raw['accessToken']) as
      | string
      | undefined;
    const userRaw = (data['user'] ?? raw['user']) as Record<string, unknown> | undefined;

    if (!token || !userRaw) return null;

    const user: LoginResponse['user'] = {
      id: String(userRaw['id'] ?? userRaw['_id'] ?? ''),
      name: String(userRaw['name'] ?? ''),
      email: String(userRaw['email'] ?? ''),
      role: this.normalizeRole(userRaw['role'] ?? userRaw['roleName'] ?? userRaw['roleId']) ?? 'COLABORADOR',
      active: Boolean(userRaw['active'] ?? userRaw['isActive'] ?? true)
    };

    if (!user.id || !user.email) return null;
    return { token, user };
  }

  saveSession(response: LoginResponse): void {
    const normalizedUser: LoginResponse['user'] = {
      ...response.user,
      role: this.normalizeRole(response.user.role) ?? response.user.role
    };
    const userRaw = JSON.stringify(normalizedUser);
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
    const normalizedRole = this.normalizeRole(role);
    if (normalizedRole === 'ADMIN') {
      this.router.navigate(['/users']);
      return;
    }
    if (normalizedRole === 'GERENTE') {
      this.router.navigate(['/projects']);
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  normalizeRole(rawRole: unknown): Role | null {
    if (typeof rawRole === 'string') {
      const upper = rawRole.trim().toUpperCase();
      if (upper === 'ADMIN' || upper === 'GERENTE' || upper === 'COLABORADOR') return upper;
      if (upper === '1' || upper === 'MANAGER') return upper === 'MANAGER' ? 'GERENTE' : 'ADMIN';
      if (upper === '2') return 'GERENTE';
      if (upper === '3') return 'COLABORADOR';
    }
    if (typeof rawRole === 'number') {
      if (rawRole === 1) return 'ADMIN';
      if (rawRole === 2) return 'GERENTE';
      if (rawRole === 3) return 'COLABORADOR';
    }
    if (rawRole && typeof rawRole === 'object') {
      const roleObject = rawRole as {
        id?: number | string;
        roleId?: number | string;
        name?: string;
        roleName?: string;
      };
      return this.normalizeRole(roleObject.roleName ?? roleObject.name ?? roleObject.roleId ?? roleObject.id);
    }
    return null;
  }

  private getRoleFromToken(): Role | null {
    const token = this._token();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64Url)) as { role?: unknown; roleName?: unknown };
      return this.normalizeRole(payload.role ?? payload.roleName);
    } catch {
      return null;
    }
  }
}
