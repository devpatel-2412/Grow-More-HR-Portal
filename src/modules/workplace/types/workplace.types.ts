// Tickets
export type TicketCategory = 'HR' | 'IT' | 'FINANCE' | 'SUPPORT';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface TicketCommentRecord {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  assignedToId: string | null;
  createdAt: string;
  comments?: TicketCommentRecord[];
}

/** Mirrors the server's ticket state machine. */
export const TICKET_FORWARD: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
};

// Knowledge base
export interface KbArticleRecord {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// Documents
export interface DocumentRecord {
  id: string;
  tenantId: string;
  name: string;
  category: string | null;
  folderPath: string;
  fileUrl: string;
  version: number;
  expiresAt: string | null;
  isDigitallySigned: boolean;
  archived: boolean;
  archivedAt: string | null;
  uploadedById: string | null;
  createdAt: string;
}

export interface DocumentVersionRecord {
  id: string;
  version: number;
  fileUrl: string;
  createdAt: string;
  uploadedBy: { firstName: string; lastName: string } | null;
}

// Assets
export type AssetType = 'LAPTOP' | 'DESKTOP' | 'PHONE' | 'SIM' | 'ID_CARD' | 'SOFTWARE_LICENSE' | 'VEHICLE' | 'OTHER';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'UNDER_REPAIR' | 'RETIRED';

export interface AssetRecord {
  id: string;
  tenantId: string;
  employeeId: string | null;
  name: string;
  serialNumber: string;
  type: AssetType;
  status: AssetStatus;
  notes: string | null;
  assignedAt: string | null;
  createdAt: string;
}

// Visitors
export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT';

export interface VisitorRecord {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  hostEmployeeId: string;
  purpose: string;
  expectedAt: string;
  qrPassCode: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: VisitorStatus;
  createdAt: string;
}

// Room bookings
export type RoomBookingStatus = 'CONFIRMED' | 'CANCELLED';

export interface RoomBookingRecord {
  id: string;
  tenantId: string;
  roomName: string;
  employeeId: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: RoomBookingStatus;
  createdAt: string;
}
