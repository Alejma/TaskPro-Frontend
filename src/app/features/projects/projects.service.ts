import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Project, ProjectPayload } from '../../core/models/project.model';

const API_URL = 'http://localhost:3000/api/projects';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(API_URL);
  }

  getProjectById(id: string): Observable<Project> {
    return this.http.get<Project>(`${API_URL}/${id}`);
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
