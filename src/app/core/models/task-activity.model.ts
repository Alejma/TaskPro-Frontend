export interface TaskActivity {
  id: number;
  taskId: number;
  userId: number;
  action: 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGE' | 'COMMENTED';
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: number; name: string };
}

export interface Comment {
  id: number;
  content: string;
  fileUrl: string | null;
  userId: number;
  taskId: number;
  createdAt: string;
  user: { id: number; name: string };
}
