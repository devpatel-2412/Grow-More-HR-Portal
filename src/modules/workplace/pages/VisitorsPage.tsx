import { toast } from 'sonner';
import { UserCheck } from 'lucide-react';
import { useVisitors, useCheckInVisitor, useCheckOutVisitor } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { RegisterVisitorDialog } from '../components/RegisterVisitorDialog';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';
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
  const canManage = useHasPermission('visitor:manage');
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

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
    <ListPage
      title="Visitors"
      subtitle="Front-desk registration and check-in."
      actions={<RegisterVisitorDialog />}
      state={state}
      errorProps={{ description: 'Failed to load visitors.', onRetry: () => refetch() }}
      emptyProps={{ icon: UserCheck, title: 'No visitors yet', description: 'Register your first expected visitor.' }}
    >
      {data && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
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
                  {canManage && (
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
