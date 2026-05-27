export interface UserLoad {
  id: number;
  name: string;
  email: string;
  weightLoad: number;
  taskCount: number;
  completedTasks: number;
  progress: number;
}

export interface ProjectMetrics {
  projectId: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  progressPercentage: number;
  totalWeight: number;
  completedWeight: number;
  weightProgress: number;
  averagePriority: number;
  tasksByPriority: Record<string, number>;
  overdueTasks: number;
  loadByUser: UserLoad[];
}

export interface UserMetrics {
  id: string;
  name: string;
  email: string;
  rol: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalWeight: number;
  completedWeight: number;
  weightProgress: number;
  averagePriority: number;
  overdueTasks: number;
}

export interface UserInfo {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface UserPerformanceMetrics {
  user: UserInfo;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionRate: number;
  totalWeightAssigned: number;
  totalWeightCompleted: number;
  weightCompletionRate: number;
  totalPriorityScore: number;
  priorityCompletedScore: number;
  priorityEfficiency: number;
  overdueTasks: number;
  avgCompletionHours: number | null;
  projectAvgCompletionHours: number;
  speedRatio: number | null;
  efficiencyScore: number | null;
}

export interface UsersPerformanceResponse {
  projectId: number;
  period: string;
  globalAvgCompletionHours: number;
  totalProjectTasks: number;
  users: UserPerformanceMetrics[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
