export type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'CHURNED';

export interface ClientContactRecord {
  id: string;
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

export interface OwnClientProfile {
  id: string;
  companyName: string;
  contactEmail: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  industry: string | null;
  logoUrl: string | null;
  status: ClientStatus;
  contacts: ClientContactRecord[];
  projects: ClientProjectSummary[];
}
