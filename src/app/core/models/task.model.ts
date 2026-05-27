export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  projectId: string;
  projectName?: string;
  assigneeIds: string[];
  dueDate?: string;
}

export type KanbanResponse = Record<TaskStatus, Task[]>;

export interface TaskPayload {
  title: string;
  description: string;
  status: TaskStatus;
  priority: number;
  assigneeIds: string[];
  dueDate?: string;
  projectId?: string;
}
