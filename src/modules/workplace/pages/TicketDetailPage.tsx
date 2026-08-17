import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTicket, useChangeTicketStatus, useAssignTicket, useAddTicketComment } from '../hooks/useWorkplace';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { usePermissions } from '../../auth/hooks/useHasPermission';
import { TicketStatusBadge } from '../components/TicketBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import { DetailPageShell } from '../../../shared/components/layout/DetailPageShell';
import { TICKET_FORWARD, type TicketStatus } from '../types/workplace.types';

const NO_ASSIGNEE = '__none__';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading, isError, refetch } = useTicket(id);
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const changeStatus = useChangeTicketStatus();
  const assign = useAssignTicket();
  const addComment = useAddTicketComment();
  const [comment, setComment] = useState('');
  const { hasAny, has } = usePermissions();
  // Mirrors the backend guards exactly: status change accepts ticket:manage OR ticket:create,
  // assignment is ticket:manage-only, comments accept ticket:manage OR ticket:view:self.
  const canChangeStatus = hasAny(['ticket:manage', 'ticket:create']);
  const canAssign = has('ticket:manage');
  const canComment = hasAny(['ticket:manage', 'ticket:view:self']);

  async function move(status: TicketStatus) {
    if (!id) return;
    try {
      await changeStatus.mutateAsync({ id, status });
      toast.success(`Moved to ${status.replace('_', ' ').toLowerCase()}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update this ticket.');
    }
  }

  async function handleAssign(employeeId: string) {
    if (!id) return;
    try {
      await assign.mutateAsync({ id, assignedToId: employeeId === NO_ASSIGNEE ? null : employeeId });
      toast.success('Ticket assigned.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to assign this ticket.');
    }
  }

  async function submitComment() {
    if (!id || !comment.trim()) return;
    try {
      await addComment.mutateAsync({ id, body: comment.trim() });
      setComment('');
      toast.success('Comment added.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to add this comment.');
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !ticket) return <ErrorState description="Failed to load this ticket." onRetry={() => refetch()} />;

  return (
    <DetailPageShell
      maxWidth="3xl"
      breadcrumb={[{ label: 'Helpdesk', to: '/helpdesk' }, { label: ticket.subject }]}
      title={ticket.subject}
      badge={<TicketStatusBadge status={ticket.status} />}
    >
      <div className="space-y-6">
        <Card className="space-y-4">
          <p className="text-sm text-[var(--foreground)]">{ticket.description}</p>

          {canChangeStatus && (
            <div className="flex flex-wrap items-center gap-2">
              {TICKET_FORWARD[ticket.status].map((next) => (
                <Button key={next} size="sm" variant="outline" onClick={() => move(next)} loading={changeStatus.isPending}>
                  Move to {next.replace('_', ' ').toLowerCase()}
                </Button>
              ))}
            </div>
          )}

          {canAssign && (
            <div className="max-w-xs">
              <Select value={ticket.assignedToId ?? NO_ASSIGNEE} onValueChange={handleAssign}>
                <SelectTrigger aria-label="Assign to">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>Unassigned</SelectItem>
                  {(employeePage?.data ?? []).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Comments</h3>
          {(ticket.comments ?? []).map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--border)] p-2 text-sm">
              {c.body}
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{new Date(c.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {(ticket.comments ?? []).length === 0 && <p className="text-xs text-[var(--muted-foreground)]">No comments yet.</p>}

          {canComment && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Add a comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && submitComment()}
              />
              <Button onClick={submitComment} loading={addComment.isPending}>
                Post
              </Button>
            </div>
          )}
        </Card>
      </div>
    </DetailPageShell>
  );
}
