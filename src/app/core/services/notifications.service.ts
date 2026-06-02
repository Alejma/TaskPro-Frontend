import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AppNotification, NotificationType } from '../models/notification.model';
import { AuditLogEntry } from '../models/audit-log.model';
import { Task } from '../models/task.model';
import { AuditService } from './audit.service';
import { AuthService } from './auth.service';
import { TasksService } from '../../features/tasks/tasks.service';

const API_URL = 'http://localhost:3000/api/notifications';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly auditService = inject(AuditService);
  private readonly authService = inject(AuthService);
  private readonly tasksService = inject(TasksService);

  private readonly items = signal<AppNotification[]>([]);
  readonly notifications = this.items.asReadonly();
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);

  load(): void {
    const role = this.authService.role();
    const userId = this.authService.user()?.id;
    const userName = this.authService.user()?.name;

    if (!userId) {
      this.items.set([]);
      return;
    }

    const request$ =
      role === 'ADMIN'
        ? this.http.get<unknown>(API_URL).pipe(
            map((response) => this.normalizeResponse(response, true)),
            catchError(() =>
              this.auditService.getAuditLogs().pipe(
                map((logs) => this.fromAuditLogs(logs)),
                catchError(() => of(this.getAdminFallbackNotifications()))
              )
            )
          )
        : this.http.get<unknown>(`${API_URL}/user/${userId}`).pipe(
            map((response) => this.normalizeResponse(response, false)),
            catchError(() => this.loadUserTaskNotifications(userId, userName)),
            catchError(() => of(this.getUserFallbackNotifications(userId, userName)))
          );

    request$.pipe(tap((list) => this.items.set(this.applyScope(list)))).subscribe();
  }

  markAllAsRead(): void {
    this.items.update((list) => list.map((item) => ({ ...item, read: true })));
  }

  markAsRead(id: string): void {
    this.items.update((list) =>
      list.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  private applyScope(list: AppNotification[]): AppNotification[] {
    if (this.authService.role() === 'ADMIN') {
      return this.sortByDateDesc(list);
    }

    const userId = this.authService.user()?.id;
    if (!userId) return [];

    return this.sortByDateDesc(
      list.filter((item) => !item.recipientId || item.recipientId === userId)
    );
  }

  private loadUserTaskNotifications(userId: string, userName?: string) {
    return this.tasksService.getAllTasks().pipe(
      switchMap((tasks) =>
        this.auditService.getAuditLogs().pipe(
          map((logs) => this.buildUserNotifications(tasks, logs, userId, userName)),
          catchError(() => of(this.buildUserNotifications(tasks, [], userId, userName)))
        )
      ),
      map((list) => (list.length ? list : this.getUserFallbackNotifications(userId, userName)))
    );
  }

  private buildUserNotifications(
    tasks: Task[],
    logs: AuditLogEntry[],
    userId: string,
    userName?: string
  ): AppNotification[] {
    const notifications: AppNotification[] = [];
    const myTasks = tasks.filter((task) => task.assigneeIds.includes(userId));

    for (const task of myTasks) {
      notifications.push({
        id: `assign-${task.id}`,
        type: 'assignment',
        message: `Tienes asignada la tarea "${task.title}" en ${task.projectName ?? 'tu proyecto'}`,
        createdAt: task.updatedAt ?? task.createdAt ?? new Date().toISOString(),
        read: false,
        recipientId: userId,
        link: `/tasks/${task.id}/view`
      });

      if (task.dueDate && task.status !== 'DONE') {
        const dueMs = new Date(task.dueDate).getTime();
        const daysLeft = Math.ceil((dueMs - Date.now()) / (24 * 60 * 60 * 1000));
        if (daysLeft <= 7) {
          notifications.push({
            id: `deadline-${task.id}`,
            type: 'deadline',
            message: `Fecha límite próxima en "${task.title}" (${task.projectName ?? 'proyecto'})`,
            createdAt: task.dueDate,
            read: daysLeft > 2,
            recipientId: userId,
            link: `/tasks/${task.id}/view`
          });
        }
      }

      if (task.status === 'DONE') {
        notifications.push({
          id: `done-${task.id}`,
          type: 'completed',
          message: `Completaste la tarea "${task.title}" en ${task.projectName ?? 'tu proyecto'}`,
          createdAt: task.updatedAt ?? task.createdAt ?? new Date().toISOString(),
          read: true,
          recipientId: userId,
          link: `/tasks/${task.id}/view`
        });
      }
    }

    for (const log of logs) {
      if (log.userId === userId) continue;
      if (!this.logRelatesToUser(log, userId, userName, myTasks)) continue;

      notifications.push({
        id: `audit-${log.id}`,
        type: this.typeFromAuditAction(log.action),
        message: log.details || `${log.userName} — ${log.actionLabel}`,
        createdAt: log.createdAt,
        read: false,
        recipientId: userId,
        actorInitials: this.getInitials(log.userName),
        actorName: log.userName
      });
    }

    return this.sortByDateDesc(notifications).slice(0, 12);
  }

  private logRelatesToUser(
    log: AuditLogEntry,
    userId: string,
    userName: string | undefined,
    myTasks: Task[]
  ): boolean {
    const details = `${log.details} ${log.actionLabel}`.toLowerCase();
    const normalizedName = userName?.trim().toLowerCase();

    if (normalizedName && details.includes(normalizedName)) return true;
    if (details.includes('te asign') || details.includes('asignado a ti')) return true;

    return myTasks.some((task) => details.includes(task.title.toLowerCase()));
  }

  private normalizeResponse(response: unknown, allowGlobalFallback: boolean): AppNotification[] {
    const raw = this.unwrapList(response);
    const normalized = raw
      .map((item) => this.normalizeItem(item))
      .filter((item): item is AppNotification => !!item);

    if (normalized.length) return normalized;

    const userId = this.authService.user()?.id;
    const userName = this.authService.user()?.name;
    return allowGlobalFallback
      ? this.getAdminFallbackNotifications()
      : this.getUserFallbackNotifications(userId ?? 'user', userName);
  }

  private unwrapList(response: unknown): unknown[] {
    if (Array.isArray(response)) return response;
    const obj = (response ?? {}) as Record<string, unknown>;
    const data = obj['data'] ?? obj['notifications'] ?? obj['items'];
    return Array.isArray(data) ? data : [];
  }

  private normalizeItem(raw: unknown): AppNotification | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item['id'] ?? item['_id'] ?? '');
    const message = String(item['message'] ?? item['text'] ?? item['details'] ?? '');
    const createdAt = String(item['createdAt'] ?? item['timestamp'] ?? item['date'] ?? '');
    if (!id || !message || !createdAt) return null;

    const type = this.normalizeType(String(item['type'] ?? item['kind'] ?? ''));
    const actorName = String(
      item['actorName'] ?? item['userName'] ?? (item['user'] as Record<string, unknown>)?.['name'] ?? ''
    );
    const recipientRaw =
      item['recipientId'] ??
      item['userId'] ??
      item['targetUserId'] ??
      (item['recipient'] as Record<string, unknown>)?.['id'];

    return {
      id,
      type,
      message,
      createdAt,
      read: Boolean(item['read'] ?? item['isRead'] ?? false),
      recipientId: recipientRaw != null ? String(recipientRaw) : undefined,
      actorInitials: actorName ? this.getInitials(actorName) : undefined,
      actorName: actorName || undefined,
      link: item['link'] ? String(item['link']) : undefined
    };
  }

  private normalizeType(raw: string): NotificationType {
    const upper = raw.toUpperCase();
    if (upper.includes('COMMENT')) return 'comment';
    if (upper.includes('ASSIGN')) return 'assignment';
    if (upper.includes('DEADLINE') || upper.includes('DUE')) return 'deadline';
    if (upper.includes('SHARE')) return 'share';
    if (upper.includes('COMPLETE') || upper.includes('DONE')) return 'completed';
    return 'comment';
  }

  private fromAuditLogs(logs: AuditLogEntry[]): AppNotification[] {
    if (!logs.length) return this.getAdminFallbackNotifications();

    return logs.slice(0, 12).map((log) => ({
      id: log.id,
      type: this.typeFromAuditAction(log.action),
      message: log.details || `${log.userName} — ${log.actionLabel}`,
      createdAt: log.createdAt,
      read: false,
      actorInitials: this.getInitials(log.userName),
      actorName: log.userName
    }));
  }

  private typeFromAuditAction(action: string): NotificationType {
    const upper = action.toUpperCase();
    if (upper.includes('COMMENT')) return 'comment';
    if (upper.includes('ASSIGN')) return 'assignment';
    if (upper.includes('DUE') || upper.includes('DEADLINE')) return 'deadline';
    if (upper.includes('SHARE')) return 'share';
    if (upper.includes('DONE') || upper.includes('COMPLETE') || upper.includes('STATUS')) return 'completed';
    return 'comment';
  }

  private getAdminFallbackNotifications(): AppNotification[] {
    const now = Date.now();
    const hours = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
    const days = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

    return [
      {
        id: 'demo-1',
        type: 'comment',
        message: 'Nuevo comentario en Bugs & Incidencias',
        createdAt: hours(5),
        read: false
      },
      {
        id: 'demo-2',
        type: 'assignment',
        message: 'Carlos Delgado asignó una tarea en Pipeline Test',
        createdAt: days(1),
        read: false,
        actorInitials: 'CD',
        actorName: 'Carlos Delgado'
      },
      {
        id: 'demo-3',
        type: 'deadline',
        message: 'Fecha límite próxima en Campaña Navidad',
        createdAt: days(1),
        read: true
      },
      {
        id: 'demo-4',
        type: 'share',
        message: 'Carlos López compartió Onboarding Nuevos',
        createdAt: days(2),
        read: true,
        actorInitials: 'CL',
        actorName: 'Carlos López'
      },
      {
        id: 'demo-5',
        type: 'completed',
        message: 'Tarea completada en Calendario por Ana Restrepo',
        createdAt: days(3),
        read: true,
        actorInitials: 'AR',
        actorName: 'Ana Restrepo'
      }
    ];
  }

  private getUserFallbackNotifications(userId: string, userName?: string): AppNotification[] {
    const now = Date.now();
    const hours = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();
    const days = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();
    const label = userName?.split(' ')[0] ?? 'tu cuenta';

    return [
      {
        id: `demo-user-assign-${userId}`,
        type: 'assignment',
        message: `Se te asignó una nueva tarea en TaskPro Mobile`,
        createdAt: hours(6),
        read: false,
        recipientId: userId
      },
      {
        id: `demo-user-deadline-${userId}`,
        type: 'deadline',
        message: `${label}, tienes una fecha límite próxima en uno de tus proyectos`,
        createdAt: days(1),
        read: false,
        recipientId: userId
      },
      {
        id: `demo-user-comment-${userId}`,
        type: 'comment',
        message: 'Hay un nuevo comentario en una tarea asignada a ti',
        createdAt: days(2),
        read: true,
        recipientId: userId
      }
    ];
  }

  private sortByDateDesc(list: AppNotification[]): AppNotification[] {
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase() || 'U';
  }
}
