import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService } from './tasks.service';
import { Task } from '../../core/models/task.model';
import { TaskActivity, Comment } from '../../core/models/task-activity.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-task-view',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatProgressBarModule,
  ],
  templateUrl: './task-view.component.html',
  styleUrls: ['./task-view.component.scss'],
})
export class TaskViewComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksService = inject(TasksService);
  readonly authService = inject(AuthService);

  readonly task = signal<Task | null>(null);
  readonly activity = signal<TaskActivity[]>([]);
  readonly comments = signal<Comment[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly newCommentText = signal('');
  readonly newCommentFile = signal<File | null>(null);
  readonly sendingComment = signal(false);

  ngOnInit(): void {
    const taskId = this.route.snapshot.paramMap.get('id');
    if (!taskId) { this.error.set(true); this.loading.set(false); return; }

    this.tasksService.getTaskById(taskId).subscribe({
      next: (data) => {
        const norm = this.unwrap(data);
        this.task.set(norm);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });

    this.tasksService.getTaskActivity(taskId).subscribe({
      next: (data) => this.activity.set(data),
    });

    this.tasksService.getComments(taskId).subscribe({
      next: (data) => this.comments.set(data),
    });
  }

  private unwrap(response: unknown): Task | null {
    if (!response || typeof response !== 'object') return null;
    const obj = response as Record<string, unknown>;
    const data = (obj['data'] ?? obj) as Record<string, unknown>;
    const id = String(data['id'] ?? data['_id'] ?? '');
    if (!id) return null;
    return {
      id,
      title: String(data['title'] ?? ''),
      description: String(data['description'] ?? ''),
      status: (data['status'] as Task['status']) ?? 'PENDING',
      priority: typeof data['priority'] === 'number' ? data['priority'] as number : 2,
      projectId: String(data['projectId'] ?? ''),
      assigneeIds: ((data['assigneeIds'] ?? []) as Array<string | number>).map(String),
      dueDate: data['dueDate'] as string | undefined,
    };
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.newCommentFile.set(target.files?.item(0) ?? null);
  }

  sendComment(): void {
    const taskId = this.task()?.id;
    const text = this.newCommentText()?.trim();
    if (!taskId || !text || this.sendingComment()) return;

    this.sendingComment.set(true);
    this.tasksService.createComment(taskId, text, this.newCommentFile()).subscribe({
      next: (comment) => {
        this.comments.update((list) => [comment, ...list]);
        this.newCommentText.set('');
        this.newCommentFile.set(null);
        this.sendingComment.set(false);
      },
      error: () => this.sendingComment.set(false),
    });
  }

  getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      CREATED: 'add_circle',
      ASSIGNED: 'group_add',
      STATUS_CHANGE: 'swap_horiz',
      COMMENTED: 'chat',
    };
    return icons[action] ?? 'fiber_manual_record';
  }

  getActivityColor(action: string): string {
    const colors: Record<string, string> = {
      CREATED: '#5f4b90',
      ASSIGNED: '#1565c0',
      STATUS_CHANGE: '#e65100',
      COMMENTED: '#2e7d32',
    };
    return colors[action] ?? '#7b829b';
  }

  getPriorityLabel(p: number | undefined): string {
    const labels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Urgente' };
    return labels[p ?? 2] ?? 'Media';
  }

  getStatusLabel(s: string | undefined): string {
    const labels: Record<string, string> = { PENDING: 'Pendiente', IN_PROGRESS: 'En proceso', DONE: 'Finalizada' };
    return labels[s ?? ''] ?? s ?? '';
  }

  getActivityDescription(a: TaskActivity): string {
    const user = a.user?.name ?? 'Alguien';
    switch (a.action) {
      case 'CREATED': return `${user} creó la tarea`;
      case 'ASSIGNED': return `${user} asignó la tarea`;
      case 'STATUS_CHANGE': {
        const from = this.getStatusLabel(String(a.metadata?.['from'] ?? ''));
        const to = this.getStatusLabel(String(a.metadata?.['to'] ?? ''));
        return `${user} cambió de ${from} → ${to}`;
      }
      case 'COMMENTED': return `${user} comentó`;
      default: return `${user} realizó una acción`;
    }
  }
}
