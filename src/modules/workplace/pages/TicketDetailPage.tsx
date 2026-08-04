import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { useTicket, useChangeTicketStatus, useAssignTicket, useAddTicketComment } from '../hooks/useWorkplace';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { TicketStatusBadge } from '../components/TicketBadges';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
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
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/helpdesk" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All tickets
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{ticket.subject}</h1>
        <TicketStatusBadge status={ticket.status} />
      </div>

      <Card className="space-y-4">
        <p className="text-sm text-[var(--foreground)]">{ticket.description}</p>

        <div className="flex flex-wrap items-center gap-2">
          {TICKET_FORWARD[ticket.status].map((next) => (
            <Button key={next} size="sm" variant="outline" onClick={() => move(next)} loading={changeStatus.isPending}>
              Move to {next.replace('_', ' ').toLowerCase()}
            </Button>
          ))}
        </div>

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

        <div className="flex gap-2">
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
      </Card>
    </div>
  );
}
