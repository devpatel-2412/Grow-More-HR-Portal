export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type CrmActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';

export interface LeadRecord {
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: LeadStatus;
  estimatedValue: number;
  ownerId: string | null;
  notes: string | null;
  lostReason: string | null;
  createdAt: string;
}

export interface CrmActivityRecord {
  id: string;
  tenantId: string;
  type: CrmActivityType;
  subject: string;
  body: string | null;
  occurredAt: string;
  leadId: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface LeadPipelineRow {
  status: LeadStatus;
  count: number;
  value: number;
}

/** Mirrors the server's funnel rules — WON is reachable only directly from PROPOSAL. */
export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['WON', 'LOST'],
  WON: [],
  LOST: [],
};

export const LEAD_STAGES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
