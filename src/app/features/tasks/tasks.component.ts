import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Task } from '../../core/models/task.model';
import { TasksService } from './tasks.service';
import { TaskFormModalComponent } from '../../shared/components/task-form-modal/task-form-modal.component';

interface TaskGroup {
  projectId: string;
  projectName: string;
  tasks: Task[];
}

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tasksService = inject(TasksService);
  private readonly dialog = inject(MatDialog);

  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(true);

  readonly taskGroups = computed(() => {
    const groups = new Map<string, TaskGroup>();
    for (const task of this.tasks()) {
      const key = task.projectId;
      if (!groups.has(key)) {
        groups.set(key, { projectId: key, projectName: task.projectName ?? key, tasks: [] });
      }
      groups.get(key)!.tasks.push(task);
    }
    return Array.from(groups.values());
  });

  readonly totalTasks = computed(() => this.tasks().length);
  readonly completedTasks = computed(() => this.tasks().filter((t) => t.status === 'DONE').length);
  readonly pendingTasks = computed(() => this.tasks().filter((t) => t.status === 'PENDING').length);

  ngOnInit(): void {
    this.loadTasks();
  }

  getPriorityLabel(priority: number | undefined): string {
    const labels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Urgente' };
    return labels[priority ?? 2] ?? 'Media';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = { PENDING: 'pending_actions', IN_PROGRESS: 'sync', DONE: 'check_circle' };
    return icons[status] ?? 'fiber_manual_record';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = { PENDING: '#e65100', IN_PROGRESS: '#1565c0', DONE: '#2e7d32' };
    return colors[status] ?? '#7b829b';
  }

  openCreateModal(projectId?: string): void {
    const ref = this.dialog.open(TaskFormModalComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data: projectId ? { projectId } : {}
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  openEditModal(task: Task): void {
    const ref = this.dialog.open(TaskFormModalComponent, {
      width: '560px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { projectId: task.projectId, task }
    });
    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTasks();
      }
    });
  }

  private loadTasks(): void {
    this.loading.set(true);
    this.tasksService.getAllTasks().subscribe({
      next: (response) => {
        const list = extractTaskArray(response);
        this.tasks.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

function extractTaskArray(response: unknown): Task[] {
  if (Array.isArray(response)) return response as Task[];
  const obj = response as Record<string, unknown>;
  if (Array.isArray(obj['data'])) return obj['data'] as Task[];
  if (Array.isArray(obj['tasks'])) return obj['tasks'] as Task[];
  return [];
}
