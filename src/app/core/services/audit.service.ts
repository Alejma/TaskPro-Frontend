import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { AuditLogEntry } from '../models/audit-log.model';
import { TaskActivity } from '../models/task-activity.model';
import { Task } from '../models/task.model';
import { TasksService } from '../../features/tasks/tasks.service';

const API_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly tasksService = inject(TasksService);

  getAuditLogs(): Observable<AuditLogEntry[]> {
    return this.http.get<unknown>(`${API_URL}/dashboard/audit-logs`).pipe(
      map((response) => this.normalizeAuditResponse(response)),
      catchError(() => this.loadFromTaskActivities())
    );
  }

  private loadFromTaskActivities(): Observable<AuditLogEntry[]> {
    return this.tasksService.getAllTasks().pipe(
      switchMap((tasks) => {
        if (!tasks.length) return of([]);

        const targets = tasks.slice(0, 50);
        return forkJoin(
          targets.map((task) =>
            this.tasksService.getTaskActivity(task.id).pipe(
              map((activities) => activities.map((activity) => this.mapTaskActivity(activity, task))),
              catchError(() => of([] as AuditLogEntry[]))
            )
          )
        ).pipe(
          map((groups) => groups.flat()),
          map((logs) => this.sortByDateDesc(logs))
        );
      }),
      catchError(() => of([]))
    );
  }

  private normalizeAuditResponse(response: unknown): AuditLogEntry[] {
    const raw = this.unwrapList(response);
    return raw
      .map((item) => this.normalizeAuditItem(item))
      .filter((entry): entry is AuditLogEntry => !!entry);
  }

  private unwrapList(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    const obj = (response ?? {}) as Record<string, unknown>;
    const data = obj['data'] ?? obj['logs'] ?? obj['items'];
    return Array.isArray(data) ? data : [];
  }

  private normalizeAuditItem(raw: unknown): AuditLogEntry | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const user = (item['user'] ?? {}) as Record<string, unknown>;
    const action = String(item['action'] ?? item['type'] ?? 'UNKNOWN');
    const createdAt = String(item['createdAt'] ?? item['timestamp'] ?? item['date'] ?? '');
    const id = String(item['id'] ?? item['_id'] ?? `${action}-${createdAt}`);
    const userName = String(user['name'] ?? item['userName'] ?? 'Usuario');
    const userId = String(user['id'] ?? item['userId'] ?? '');

    if (!createdAt) return null;

    return {
      id,
      createdAt,
      userId,
      userName,
      action,
      actionLabel: String(item['actionLabel'] ?? this.getActionLabel(action)),
      details: String(item['details'] ?? item['description'] ?? item['detail'] ?? '')
    };
  }

  private mapTaskActivity(activity: TaskActivity, task: Task): AuditLogEntry {
    return {
      id: String(activity.id),
      createdAt: activity.createdAt,
      userId: String(activity.userId),
      userName: activity.user?.name ?? 'Usuario',
      action: activity.action,
      actionLabel: this.getActionLabel(activity.action),
      details: this.buildActivityDetails(activity, task)
    };
  }

  private buildActivityDetails(activity: TaskActivity, task: Task): string {
    const taskRef = task.title ? `"${task.title}"` : `Tarea #${task.id}`;

    switch (activity.action) {
      case 'CREATED':
        return `Nueva tarea ${taskRef} creada`;
      case 'ASSIGNED':
        return `Asignación actualizada en ${taskRef}`;
      case 'STATUS_CHANGE': {
        const to = this.getStatusLabel(String(activity.metadata?.['to'] ?? ''));
        return `Tarea ${taskRef} movida a "${to || 'nuevo estado'}"`;
      }
      case 'COMMENTED':
        return `Comentario agregado en ${taskRef}`;
      default:
        return `Acción registrada en ${taskRef}`;
    }
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATED: 'Tarea Creada',
      STATUS_CHANGE: 'Estado Actualizado',
      COMMENTED: 'Comentario Agregado',
      ASSIGNED: 'Miembro Agregado',
      FILE_UPLOAD: 'Archivo Subido',
      MEMBER_ADDED: 'Miembro Agregado'
    };
    return labels[action] ?? 'Actividad';
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      IN_PROGRESS: 'En Progreso',
      DONE: 'Finalizada'
    };
    return labels[status] ?? status;
  }

  private sortByDateDesc(logs: AuditLogEntry[]): AuditLogEntry[] {
    return [...logs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}
