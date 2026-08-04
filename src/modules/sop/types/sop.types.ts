export type SopStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface SopRecord {
  id: string;
  tenantId: string;
  title: string;
  category: string | null;
  department: string | null;
  version: number;
  status: SopStatus;
  body: string;
  fileUrl: string | null;
  ownerId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SopRevisionRecord {
  id: string;
  tenantId: string;
  sopId: string;
  version: number;
  body: string;
  changedById: string | null;
  createdAt: string;
}
