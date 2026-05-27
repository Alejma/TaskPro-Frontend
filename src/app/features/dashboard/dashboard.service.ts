import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface ProjectSummary {
  id: number;
  name: string;
  status: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  progress: number;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completedThisWeek: number;
  createdThisWeek: number;
  averagePriority: number;
  completionRate: number;
  totalWeight: number;
  completedWeight: number;
  weightProgress: number;
  tasksByPriority: Record<string, number>;
  projects: ProjectSummary[];
}

const API_URL = 'http://localhost:3000/api/dashboard';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<{ success: boolean; data: DashboardMetrics }>(`${API_URL}/metrics`).pipe(
      map((res) => res.data)
    );
  }
}
