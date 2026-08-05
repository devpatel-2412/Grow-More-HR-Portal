import { api } from '../../../shared/lib/api-client';
import type {
  TicketRecord,
  TicketCategory,
  TicketStatus,
  KbArticleRecord,
  DocumentRecord,
  DocumentVersionRecord,
  AssetRecord,
  AssetType,
  AssetStatus,
  VisitorRecord,
  VisitorStatus,
  RoomBookingRecord,
} from '../types/workplace.types';

export const ticketApi = {
  create: (payload: { category: TicketCategory; subject: string; description: string }) =>
    api.post<TicketRecord>('/tickets', payload),
  list: (query: { page: number; limit: number; status?: TicketStatus; category?: TicketCategory; assignedToId?: string }) =>
    api.getPaginated<TicketRecord>('/tickets', query),
  get: (id: string) => api.get<TicketRecord>(`/tickets/${id}`),
  changeStatus: (id: string, status: TicketStatus) => api.patch<TicketRecord>(`/tickets/${id}/status`, { status }),
  assign: (id: string, assignedToId: string | null) => api.patch<TicketRecord>(`/tickets/${id}/assign`, { assignedToId }),
  addComment: (id: string, body: string) => api.post(`/tickets/${id}/comments`, { body }),
};

export const kbApi = {
  create: (payload: { title: string; category: string; content: string }) => api.post<KbArticleRecord>('/kb-articles', payload),
  list: (query: { page: number; limit: number; category?: string; search?: string }) =>
    api.getPaginated<KbArticleRecord>('/kb-articles', query),
  get: (id: string) => api.get<KbArticleRecord>(`/kb-articles/${id}`),
  update: (id: string, payload: { title?: string; category?: string; content?: string }) =>
    api.patch<KbArticleRecord>(`/kb-articles/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/kb-articles/${id}`),
};

export interface UploadDocumentPayload {
  files: File[];
  category?: string;
  folderPath: string;
  isDigitallySigned: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export const documentApi = {
  upload: (payload: UploadDocumentPayload) => {
    const { files, ...meta } = payload;
    const formData = new FormData();
    // The filename is passed explicitly rather than relying on FormData defaulting it from
    // `file.name` — that default doesn't reliably survive every environment this runs through.
    files.forEach((file) => formData.append('files', file, file.name));
    if (meta.category) formData.append('category', meta.category);
    formData.append('folderPath', meta.folderPath);
    formData.append('isDigitallySigned', String(meta.isDigitallySigned));
    if (meta.relatedEntityType) formData.append('relatedEntityType', meta.relatedEntityType);
    if (meta.relatedEntityId) formData.append('relatedEntityId', meta.relatedEntityId);
    return api.post<DocumentRecord[]>('/documents', formData);
  },
  list: (query: {
    page: number;
    limit: number;
    folderPath?: string;
    category?: string;
    search?: string;
    archived?: boolean;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) => api.getPaginated<DocumentRecord>('/documents', query),
  remove: (id: string) => api.delete<void>(`/documents/${id}`),
  archive: (id: string) => api.post<DocumentRecord>(`/documents/${id}/archive`),
  restore: (id: string) => api.post<DocumentRecord>(`/documents/${id}/restore`),
  replaceFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return api.post<DocumentRecord>(`/documents/${id}/replace`, formData);
  },
  listVersions: (id: string) => api.get<DocumentVersionRecord[]>(`/documents/${id}/versions`),
  getDownloadUrl: (id: string) => api.get<{ url: string; fileName: string }>(`/documents/${id}/download`),
  getVersionDownloadUrl: (id: string, versionId: string) =>
    api.get<{ url: string; fileName: string }>(`/documents/${id}/versions/${versionId}/download`),
};

export const assetApi = {
  create: (payload: { name: string; serialNumber: string; type: AssetType; notes?: string }) =>
    api.post<AssetRecord>('/assets', payload),
  list: (query: { page: number; limit: number; status?: AssetStatus; type?: AssetType }) =>
    api.getPaginated<AssetRecord>('/assets', query),
  assign: (id: string, employeeId: string) => api.patch<AssetRecord>(`/assets/${id}/assign`, { employeeId }),
  unassign: (id: string) => api.patch<AssetRecord>(`/assets/${id}/unassign`),
  changeStatus: (id: string, status: 'AVAILABLE' | 'UNDER_REPAIR' | 'RETIRED') =>
    api.patch<AssetRecord>(`/assets/${id}/status`, { status }),
};

export const visitorApi = {
  register: (payload: { name: string; email: string; phone: string; hostEmployeeId: string; purpose: string; expectedAt: string }) =>
    api.post<VisitorRecord>('/visitors', payload),
  list: (query: { page: number; limit: number; status?: VisitorStatus }) => api.getPaginated<VisitorRecord>('/visitors', query),
  checkIn: (id: string) => api.post<VisitorRecord>(`/visitors/${id}/check-in`),
  checkOut: (id: string) => api.post<VisitorRecord>(`/visitors/${id}/check-out`),
};

export const roomBookingApi = {
  create: (payload: { roomName: string; startTime: string; endTime: string; purpose: string }) =>
    api.post<RoomBookingRecord>('/room-bookings', payload),
  list: (query: { page: number; limit: number; roomName?: string }) => api.getPaginated<RoomBookingRecord>('/room-bookings', query),
  cancel: (id: string) => api.post<RoomBookingRecord>(`/room-bookings/${id}/cancel`),
};
