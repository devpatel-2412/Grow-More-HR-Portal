export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
}
