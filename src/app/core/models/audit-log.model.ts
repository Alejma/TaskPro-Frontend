export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  action: string;
  actionLabel: string;
  details: string;
}
