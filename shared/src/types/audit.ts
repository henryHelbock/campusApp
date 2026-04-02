export interface AuditLog {
  id: number;
  adminUserId: number;
  action: string;
  affectedContentId: number;
  timestamp: string;
}
