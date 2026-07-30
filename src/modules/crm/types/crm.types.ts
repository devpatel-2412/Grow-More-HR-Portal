export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'CHURNED';
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
  convertedClientId: string | null;
  createdAt: string;
}

export interface ClientContactRecord {
  id: string;
  clientId: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  isPrimary: boolean;
}

export interface ClientProjectSummary {
  id: string;
  name: string;
  status: string;
}

export interface ClientRecord {
  id: string;
  tenantId: string;
  companyName: string;
  contactEmail: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  industry: string | null;
  logoUrl: string | null;
  status: ClientStatus;
  accountManagerId: string | null;
  notes: string | null;
  createdAt: string;
  contacts?: ClientContactRecord[];
  projects?: ClientProjectSummary[];
}

export interface CrmActivityRecord {
  id: string;
  tenantId: string;
  type: CrmActivityType;
  subject: string;
  body: string | null;
  occurredAt: string;
  leadId: string | null;
  clientId: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface LeadPipelineRow {
  status: LeadStatus;
  count: number;
  value: number;
}

/** Mirrors the server's funnel rules — WON is reachable only via conversion, never a plain move. */
export const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['LOST'],
  WON: [],
  LOST: [],
};

export const LEAD_STAGES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
