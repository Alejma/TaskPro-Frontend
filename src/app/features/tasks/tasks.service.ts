import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { KanbanResponse, Task, TaskPayload, TaskStatus } from '../../core/models/task.model';
import { Comment, TaskActivity } from '../../core/models/task-activity.model';

const API_URL = 'http://localhost:3000/api/tasks';
const COMMENTS_URL = 'http://localhost:3000/api/comments';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  getTasksByProject(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_URL}/project/${projectId}`);
  }

  getAllTasks(): Observable<Task[]> {
    return this.http.get<{ success: boolean; data: unknown[] }>(`${API_URL}`).pipe(
      map((res) => normalizeTaskList((res.data ?? res) as unknown[]))
    );
  }

  getTaskById(taskId: string): Observable<Task> {
    return this.http.get<Task>(`${API_URL}/${taskId}`);
  }

  createTask(projectId: string, payload: TaskPayload): Observable<Task> {
    return this.http.post<Task>(`${API_URL}/project/${projectId}`, payload);
  }

  createTaskForAllProjects(payload: TaskPayload): Observable<Task> {
    return this.http.post<Task>(`${API_URL}`, payload);
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

  getTaskActivity(taskId: string): Observable<TaskActivity[]> {
    return this.http.get<{ success: boolean; data: TaskActivity[] }>(`${API_URL}/${taskId}/activity`).pipe(
      map((res) => res.data ?? [])
    );
  }

  getComments(taskId: string): Observable<Comment[]> {
    return this.http.get<{ success: boolean; data: Comment[] }>(`${COMMENTS_URL}/task/${taskId}`).pipe(
      map((res) => res.data ?? [])
    );
  }

  createComment(taskId: string | number, content: string, file?: File | null): Observable<Comment> {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('taskId', String(taskId));
    if (file) formData.append('file', file);
    return this.http.post<{ success: boolean; data: Comment }>(`${COMMENTS_URL}`, formData).pipe(
      map((res) => res.data)
    );
  }
}

function normalizeTaskList(data: unknown[]): Task[] {
  return (data ?? []).map((item: unknown) => normalizeTaskItem(item)).filter((t): t is Task => !!t);
}

function normalizeTaskItem(raw: unknown): Task | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const id = String(item['id'] ?? item['_id'] ?? '');
  if (!id) return null;

  const assignments = item['assignments'] as Array<Record<string, unknown>> | undefined;
  const assigneeIds: string[] = [];
  if (Array.isArray(assignments)) {
    assignments.forEach((a) => {
      const user = a['user'] as Record<string, unknown> | undefined;
      if (user && user['id'] != null) {
        assigneeIds.push(String(user['id']));
      }
    });
  }

  const project = item['project'] as Record<string, unknown> | undefined;

  return {
    id,
    title: String(item['title'] ?? ''),
    description: String(item['description'] ?? ''),
    status: (item['status'] as Task['status']) ?? 'PENDING',
    priority: typeof item['priority'] === 'number' ? (item['priority'] as number) : 2,
    projectId: String(item['projectId'] ?? project?.['id'] ?? ''),
    projectName: project?.['name'] as string | undefined,
    assigneeIds,
    dueDate: item['dueDate'] as string | undefined,
  };
}
