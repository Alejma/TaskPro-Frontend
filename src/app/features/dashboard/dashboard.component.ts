import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService, DashboardMetrics } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule, MatProgressBarModule, MatTableModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly projectColumns = ['name', 'totalTasks', 'pendingTasks', 'inProgressTasks', 'completedTasks', 'progress'];

  readonly priorityEntries = computed(() => {
    const m = this.metrics();
    if (!m?.tasksByPriority) return [];
    return Object.entries(m.tasksByPriority).map(([label, count]) => ({ label, count }));
  });

  ngOnInit(): void {
    this.dashboardService.getMetrics().subscribe({
      next: (data) => { this.metrics.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
