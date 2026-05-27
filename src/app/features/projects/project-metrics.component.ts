import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MetricsService } from './metrics.service';
import { ProjectMetrics, UserPerformanceMetrics } from '../../core/models/metrics.model';

@Component({
  selector: 'app-project-metrics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    MatButtonModule,
  ],
  templateUrl: './project-metrics.component.html',
  styleUrls: ['./project-metrics.component.scss'],
})
export class ProjectMetricsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly metricsService = inject(MetricsService);

  readonly projectId = signal<string | null>(null);
  readonly metrics = signal<ProjectMetrics | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly userPerformances = signal<UserPerformanceMetrics[]>([]);
  readonly loadingUsers = signal(true);

  readonly days = signal<number | null>(null);

  readonly loadByUserColumns = ['name', 'taskCount', 'completedTasks', 'weightLoad', 'progress'];

  readonly priorityLabels: Record<string, string> = {
    '1': 'Baja', '2': 'Media', '3': 'Alta', '4': 'Urgente',
  };

  readonly priorityEntries = computed(() => {
    const m = this.metrics();
    if (!m?.tasksByPriority) return [];
    return Object.entries(m.tasksByPriority).map(([key, count]) => ({
      label: this.priorityLabels[key] ?? `Prioridad ${key}`,
      count,
    }));
  });

  readonly barData = computed(() => {
    return this.userPerformances().map((u) => ({
      name: u.user.name,
      value: u.efficiencyScore ?? u.completionRate,
      raw: u,
    }));
  });

  readonly avgValue = computed(() => {
    const vals = this.barData()
      .map((b) => b.value)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  readonly maxValue = computed(() => {
    const vals = this.barData()
      .map((b) => b.value)
      .filter((v): v is number => v != null);
    if (vals.length === 0) return 100;
    return Math.max(...vals, 100);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set(true);
      this.loading.set(false);
      this.loadingUsers.set(false);
      return;
    }
    this.projectId.set(id);
    this.loadAll();
  }

  setDaysFilter(d: number | null): void {
    this.days.set(d);
    this.loadAll();
  }

  private loadAll(): void {
    const id = this.projectId();
    if (!id) return;
    this.loading.set(true);
    this.loadingUsers.set(true);
    this.metricsService.getProjectMetrics(id, this.days()).subscribe({
      next: (data) => { this.metrics.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
    this.metricsService.getAllUsersMetrics(id, this.days()).subscribe({
      next: (data) => { this.userPerformances.set(data); this.loadingUsers.set(false); },
      error: () => { this.loadingUsers.set(false); },
    });
  }


}
