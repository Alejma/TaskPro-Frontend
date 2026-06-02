export type NotificationType = 'comment' | 'assignment' | 'deadline' | 'share' | 'completed';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  createdAt: string;
  read: boolean;
  recipientId?: string;
  actorInitials?: string;
  actorName?: string;
  link?: string;
}
