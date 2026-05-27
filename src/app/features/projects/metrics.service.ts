import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiResponse, ProjectMetrics, UserMetrics, UserPerformanceMetrics } from '../../core/models/metrics.model';

const API_URL = 'http://localhost:3000/api/projects';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly http = inject(HttpClient);

  getProjectMetrics(projectId: string, days?: number | null): Observable<ProjectMetrics> {
    let params = new HttpParams();
    if (days != null) params = params.set('days', days);
    return this.http.get<ApiResponse<ProjectMetrics>>(`${API_URL}/${projectId}/metrics`, { params }).pipe(
      map((res) => {
        const raw = (res as any).data ?? res;
        const rawLoad = (raw as any).loadByUser ?? {};
        const loadByUser = Object.values(rawLoad);
        return { ...raw, loadByUser } as ProjectMetrics;
      })
    );
  }

  getUserMetrics(projectId: string, userId: string, days?: number | null): Observable<UserMetrics> {
    let params = new HttpParams();
    if (days != null) params = params.set('days', days);
    return this.http.get<ApiResponse<UserMetrics>>(`${API_URL}/${projectId}/metrics/users/${userId}`, { params }).pipe(
      map((res) => (res as any).data ?? res)
    );
  }

  getAllUsersMetrics(projectId: string, days?: number | null): Observable<UserPerformanceMetrics[]> {
    let params = new HttpParams();
    if (days != null) params = params.set('days', days);
    return this.http.get<ApiResponse<{ users: UserPerformanceMetrics[] }>>(`${API_URL}/${projectId}/metrics/users`, { params }).pipe(
      map((res) => {
        const body = (res as any).data ?? res;
        return Array.isArray(body?.users) ? body.users : [];
      })
    );
  }
}
