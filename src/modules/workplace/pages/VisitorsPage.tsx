import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import { useVisitors, useCheckInVisitor, useCheckOutVisitor } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { RegisterVisitorDialog } from '../components/RegisterVisitorDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { VisitorStatus } from '../types/workplace.types';

const STATUS_VARIANT: Record<VisitorStatus, 'neutral' | 'info' | 'success'> = {
  EXPECTED: 'neutral',
  CHECKED_IN: 'info',
  CHECKED_OUT: 'success',
};

export function VisitorsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useVisitors({ page: pagination.page, limit: pagination.limit });
  const checkInMutation = useCheckInVisitor();
  const checkOutMutation = useCheckOutVisitor();

  async function checkIn(id: string) {
    try {
      await checkInMutation.mutateAsync(id);
      toast.success('Checked in.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to check in this visitor.');
    }
  }

  async function checkOut(id: string) {
    try {
      await checkOutMutation.mutateAsync(id);
      toast.success('Checked out.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to check out this visitor.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Visitors</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Front-desk registration and check-in.</p>
        </div>
        <RegisterVisitorDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load visitors." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState icon={UserCheck} title="No visitors yet" description="Register your first expected visitor." />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell className="font-medium">{visitor.name}</TableCell>
                    <TableCell>{visitor.purpose}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(visitor.expectedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[visitor.status]}>{visitor.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {visitor.status === 'EXPECTED' && (
                        <Button size="sm" onClick={() => checkIn(visitor.id)} loading={checkInMutation.isPending}>
                          Check in
                        </Button>
                      )}
                      {visitor.status === 'CHECKED_IN' && (
                        <Button size="sm" variant="outline" onClick={() => checkOut(visitor.id)} loading={checkOutMutation.isPending}>
                          Check out
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
