import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Project, ProjectPayload } from '../../core/models/project.model';
import { AuthService } from '../../core/services/auth.service';
import { extractProjectsList, filterProjectsForUser, normalizeProjectItem } from '../../core/utils/project.util';

const API_URL = 'http://localhost:3000/api/projects';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getProjects(): Observable<Project[]> {
    return this.http.get<unknown>(API_URL).pipe(map((response) => extractProjectsList(response)));
  }

  getProjectsForCurrentUser(): Observable<Project[]> {
    const role = this.authService.role();
    const userId = this.authService.user()?.id;

    return this.getProjects().pipe(
      map((projects) => filterProjectsForUser(projects, userId, role))
    );
  }

  getProjectById(id: string): Observable<Project> {
    return this.http.get<unknown>(`${API_URL}/${id}`).pipe(
      map((response) => {
        const root = (response as Record<string, unknown>) ?? {};
        const raw = root['data'] ?? root['project'] ?? response;
        const normalized = normalizeProjectItem(raw);
        if (!normalized) throw new Error('Proyecto no encontrado');
        return normalized;
      })
    );
  }

  createProject(payload: ProjectPayload): Observable<Project> {
    return this.http.post<Project>(API_URL, payload);
  }

  updateProject(id: string, payload: ProjectPayload): Observable<Project> {
    return this.http.put<Project>(`${API_URL}/${id}`, payload);
  }

  assignMembers(projectId: string, memberIds: string[]): Observable<Project> {
    return this.http.patch<Project>(`${API_URL}/${projectId}/members`, { memberIds });
  }
}
