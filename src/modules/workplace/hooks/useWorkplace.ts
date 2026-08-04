import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketApi, kbApi, documentApi, assetApi, visitorApi, roomBookingApi } from '../api/workplace.api';
import type {
  TicketCategory,
  TicketStatus,
  AssetType,
  AssetStatus,
  VisitorStatus,
} from '../types/workplace.types';

// ---------------------------------------------------------------- tickets

export function useTickets(query: { page: number; limit: number; status?: TicketStatus; category?: TicketCategory }) {
  return useQuery({
    queryKey: ['workplace', 'tickets', query],
    queryFn: () => ticketApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['workplace', 'ticket', id],
    queryFn: () => ticketApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { category: TicketCategory; subject: string; description: string }) => ticketApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'tickets'] }),
  });
}

export function useChangeTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) => ticketApi.changeStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'ticket'] }),
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string | null }) => ticketApi.assign(id, assignedToId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'ticket'] }),
  });
}

export function useAddTicketComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => ticketApi.addComment(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'ticket'] }),
  });
}

// ---------------------------------------------------------------- knowledge base

export function useKbArticles(query: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ['workplace', 'kb', query],
    queryFn: () => kbApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateKbArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; category: string; content: string }) => kbApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'kb'] }),
  });
}

export function useDeleteKbArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => kbApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'kb'] }),
  });
}

// ---------------------------------------------------------------- documents

export function useDocuments(query: { page: number; limit: number; folderPath?: string; category?: string; search?: string; archived?: boolean }) {
  return useQuery({
    queryKey: ['workplace', 'documents', query],
    queryFn: () => documentApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useDocumentVersions(id: string | undefined) {
  return useQuery({
    queryKey: ['workplace', 'documents', id, 'versions'],
    queryFn: () => documentApi.listVersions(id!),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; category?: string; folderPath: string; fileUrl: string; isDigitallySigned: boolean }) =>
      documentApi.upload(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'documents'] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'documents'] }),
  });
}

export function useArchiveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'documents'] }),
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentApi.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'documents'] }),
  });
}

export function useReplaceDocumentFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fileUrl }: { id: string; fileUrl: string }) => documentApi.replaceFile(id, fileUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'documents'] }),
  });
}

// ---------------------------------------------------------------- assets

export function useAssets(query: { page: number; limit: number; status?: AssetStatus; type?: AssetType }) {
  return useQuery({
    queryKey: ['workplace', 'assets', query],
    queryFn: () => assetApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; serialNumber: string; type: AssetType; notes?: string }) => assetApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'assets'] }),
  });
}

export function useAssignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, employeeId }: { id: string; employeeId: string }) => assetApi.assign(id, employeeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'assets'] }),
  });
}

export function useUnassignAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetApi.unassign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'assets'] }),
  });
}

export function useChangeAssetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'AVAILABLE' | 'UNDER_REPAIR' | 'RETIRED' }) =>
      assetApi.changeStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'assets'] }),
  });
}

// ---------------------------------------------------------------- visitors

export function useVisitors(query: { page: number; limit: number; status?: VisitorStatus }) {
  return useQuery({
    queryKey: ['workplace', 'visitors', query],
    queryFn: () => visitorApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useRegisterVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; email: string; phone: string; hostEmployeeId: string; purpose: string; expectedAt: string }) =>
      visitorApi.register(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'visitors'] }),
  });
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorApi.checkIn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'visitors'] }),
  });
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => visitorApi.checkOut(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'visitors'] }),
  });
}

// ---------------------------------------------------------------- room bookings

export function useRoomBookings(query: { page: number; limit: number; roomName?: string }) {
  return useQuery({
    queryKey: ['workplace', 'room-bookings', query],
    queryFn: () => roomBookingApi.list(query),
    placeholderData: (previous) => previous,
  });
}

export function useCreateRoomBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { roomName: string; startTime: string; endTime: string; purpose: string }) =>
      roomBookingApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'room-bookings'] }),
  });
}

export function useCancelRoomBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => roomBookingApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace', 'room-bookings'] }),
  });
}
