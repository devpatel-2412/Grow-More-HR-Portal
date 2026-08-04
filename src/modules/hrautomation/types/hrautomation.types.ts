export type TemplateType =
  | 'POSTER_WELCOME'
  | 'POSTER_BIRTHDAY'
  | 'POSTER_PROMOTION'
  | 'LETTER_OFFER'
  | 'LETTER_APPOINTMENT'
  | 'LETTER_JOINING'
  | 'LETTER_CONFIRMATION'
  | 'LETTER_PROMOTION'
  | 'LETTER_SALARY_REVISION'
  | 'LETTER_EXPERIENCE'
  | 'LETTER_RELIEVING'
  | 'LETTER_WARNING'
  | 'LETTER_APPRECIATION'
  | 'LETTER_INTERNSHIP_CERTIFICATE'
  | 'LETTER_SALARY_CERTIFICATE'
  | 'LETTER_NOC'
  | 'LETTER_FNF_SETTLEMENT';

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

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  POSTER_WELCOME: 'Welcome Poster',
  POSTER_BIRTHDAY: 'Birthday Poster',
  POSTER_PROMOTION: 'Promotion Poster',
  LETTER_OFFER: 'Offer Letter',
  LETTER_APPOINTMENT: 'Appointment Letter',
  LETTER_JOINING: 'Joining Letter',
  LETTER_CONFIRMATION: 'Confirmation Letter',
  LETTER_PROMOTION: 'Promotion Letter',
  LETTER_SALARY_REVISION: 'Salary Revision Letter',
  LETTER_EXPERIENCE: 'Experience Letter',
  LETTER_RELIEVING: 'Relieving Letter',
  LETTER_WARNING: 'Warning Letter',
  LETTER_APPRECIATION: 'Appreciation Letter',
  LETTER_INTERNSHIP_CERTIFICATE: 'Internship Certificate',
  LETTER_SALARY_CERTIFICATE: 'Salary Certificate',
  LETTER_NOC: 'No Objection Certificate',
  LETTER_FNF_SETTLEMENT: 'Full & Final Settlement Letter',
};

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
