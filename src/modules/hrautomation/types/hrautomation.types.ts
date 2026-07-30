export type TemplateType = 'POSTER_WELCOME' | 'POSTER_BIRTHDAY' | 'POSTER_PROMOTION' | 'LETTER_OFFER' | 'LETTER_EXPERIENCE' | 'LETTER_RELIEVING';

export interface LayoutField {
  id: string;
  variableKey: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
}

export interface TemplateRecord {
  id: string;
  tenantId: string;
  name: string;
  type: TemplateType;
  backgroundUrl: string | null;
  layoutFields: LayoutField[] | null;
  bodyTemplate: string | null;
  createdAt: string;
}

export interface GeneratedDocumentRecord {
  id: string;
  tenantId: string;
  templateId: string;
  employeeId: string;
  variablesJson: Record<string, string>;
  renderedContent: string;
  createdAt: string;
}

export type AnnouncementAudience = 'ALL' | 'DEPARTMENT';

export interface AnnouncementRecord {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  department: string | null;
  publishedById: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const POSTER_TYPES: TemplateType[] = ['POSTER_WELCOME', 'POSTER_BIRTHDAY', 'POSTER_PROMOTION'];

export const TEMPLATE_VARIABLES = [
  'firstName',
  'lastName',
  'employeeId',
  'department',
  'designation',
  'dateOfJoining',
  'companyName',
  'today',
] as const;
