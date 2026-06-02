import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { DashboardService, DashboardMetrics } from './dashboard.service';
import { ReportsModalComponent } from '../../shared/components/reports-modal/reports-modal.component';
import { AuditHistoryModalComponent } from '../../shared/components/audit-history-modal/audit-history-modal.component';
import { TasksService } from '../tasks/tasks.service';
import { Task } from '../../core/models/task.model';
import { AuthService } from '../../core/services/auth.service';
import { AuditService } from '../../core/services/audit.service';
import { UsersService } from '../../core/services/users.service';
import { AuditLogEntry } from '../../core/models/audit-log.model';
import {
  buildPieGradient,
  buildStatusDistribution,
  buildWeeklyBars,
  StatusSlice,
  WeeklyBar
} from './dashboard-charts.util';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatProgressBarModule, MatTableModule, MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly tasksService = inject(TasksService);
  private readonly auditService = inject(AuditService);
  private readonly usersService = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly auditLogs = signal<AuditLogEntry[]>([]);
  readonly auditUsers = signal<{ id: string; name: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly isAdmin = computed(() => this.authService.role() === 'ADMIN');
  readonly recentActivity = computed(() => this.auditLogs().slice(0, 5));

  readonly projectColumns = ['name', 'totalTasks', 'pendingTasks', 'inProgressTasks', 'completedTasks', 'progress'];

  readonly priorityEntries = computed(() => {
    const m = this.metrics();
    if (!m?.tasksByPriority) return [];
    return Object.entries(m.tasksByPriority).map(([label, count]) => ({ label, count }));
  });

  readonly statusSlices = computed<StatusSlice[]>(() => {
    const metrics = this.metrics();
    return metrics ? buildStatusDistribution(metrics) : [];
  });

  readonly pieGradient = computed(() => buildPieGradient(this.statusSlices()));

  readonly weeklyBars = computed<WeeklyBar[]>(() => {
    const metrics = this.metrics();
    if (!metrics) return [];
    return buildWeeklyBars(this.tasks(), metrics);
  });

  readonly weeklyMax = computed(() => {
    const maxValue = this.weeklyBars().reduce((max, bar) => Math.max(max, bar.planned + bar.completed), 0);
    return Math.max(maxValue, 1);
  });

  ngOnInit(): void {
    if (this.isAdmin()) {
      forkJoin({
        metrics: this.dashboardService.getMetrics(),
        tasks: this.tasksService.getAllTasks().pipe(catchError(() => of([] as Task[]))),
        auditLogs: this.auditService.getAuditLogs().pipe(catchError(() => of([] as AuditLogEntry[]))),
        auditUsers: this.usersService.getUsuarios().pipe(catchError(() => of([] as { id: string; name: string }[])))
      }).subscribe({
        next: ({ metrics, tasks, auditLogs, auditUsers }) => {
          this.metrics.set(metrics);
          this.tasks.set(tasks);
          this.auditLogs.set(auditLogs);
          this.auditUsers.set(auditUsers);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        }
      });
      return;
    }

    forkJoin({
      metrics: this.dashboardService.getMetrics(),
      tasks: this.tasksService.getAllTasks().pipe(catchError(() => of([] as Task[])))
    }).subscribe({
      next: ({ metrics, tasks }) => {
        this.metrics.set(metrics);
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  barHeight(value: number): number {
    return Math.max((value / this.weeklyMax()) * 100, value > 0 ? 8 : 0);
  }

  formatActivityDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase() || 'U';
  }

  openReportsModal(): void {
    const metrics = this.metrics();
    if (!metrics) return;

    this.dialog.open(ReportsModalComponent, {
      data: { metrics },
      width: '620px',
      maxWidth: '95vw',
      panelClass: 'reports-modal-panel'
    });
  }

  openAuditModal(): void {
    this.dialog.open(AuditHistoryModalComponent, {
      data: {
        logs: this.auditLogs(),
        users: this.auditUsers()
      },
      width: '980px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'audit-history-modal-panel'
    });
  }
}
