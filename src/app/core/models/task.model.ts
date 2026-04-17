export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  projectId: string;
  assigneeIds: string[];
  dueDate?: string;
}

export type KanbanResponse = Record<TaskStatus, Task[]>;

export interface TaskPayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeIds: string[];
  dueDate?: string;
  projectId?: string;
}
