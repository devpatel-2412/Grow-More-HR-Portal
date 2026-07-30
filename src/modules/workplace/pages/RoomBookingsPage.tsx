import { toast } from 'sonner';
import { DoorOpen } from 'lucide-react';
import { useRoomBookings, useCancelRoomBooking } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateBookingDialog } from '../components/CreateBookingDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function RoomBookingsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useRoomBookings({ page: pagination.page, limit: pagination.limit });
  const cancelMutation = useCancelRoomBooking();

  async function cancel(id: string) {
    try {
      await cancelMutation.mutateAsync(id);
      toast.success('Booking cancelled.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to cancel this booking.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Room bookings</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Reserve a meeting room — conflicts are blocked automatically.</p>
        </div>
        <CreateBookingDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load bookings." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={DoorOpen} title="No bookings yet" description="Book your first room." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.roomName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(booking.startTime).toLocaleString()} – {new Date(booking.endTime).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>{booking.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === 'CONFIRMED' ? 'success' : 'danger'}>{booking.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.status === 'CONFIRMED' && (
                        <Button size="sm" variant="ghost" onClick={() => cancel(booking.id)} loading={cancelMutation.isPending}>
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
