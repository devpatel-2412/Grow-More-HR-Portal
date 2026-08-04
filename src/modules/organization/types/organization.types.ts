export interface BranchRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isHeadOffice: boolean;
  createdAt: string;
}

export interface TeamRecord {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  branchId: string | null;
  leadId: string | null;
  createdAt: string;
}
