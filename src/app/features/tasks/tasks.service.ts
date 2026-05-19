import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { KanbanResponse, Task, TaskPayload, TaskStatus } from '../../core/models/task.model';

const API_URL = 'http://localhost:3000/api/tasks';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  getTasksByProject(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_URL}/project/${projectId}`);
  }

  createTask(projectId: string, payload: TaskPayload): Observable<Task> {
    return this.http.post<Task>(`${API_URL}/project/${projectId}`, payload);
  }

  updateTask(taskId: string, payload: Partial<TaskPayload>): Observable<Task> {
    return this.http.put<Task>(`${API_URL}/${taskId}`, payload);
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${API_URL}/${taskId}/status`, { status });
  }

  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${taskId}`);
  }

  getKanbanByProject(projectId: string): Observable<KanbanResponse> {
    return this.http.get<KanbanResponse>(`${API_URL}/kanban/${projectId}`);
  }
}
