import { Link } from 'react-router-dom';
import { Ticket as TicketIcon } from 'lucide-react';
import { useTickets } from '../hooks/useWorkplace';
import { usePagination } from '../../../shared/hooks/usePagination';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { TicketStatusBadge } from '../components/TicketBadges';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function TicketsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useTickets({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Helpdesk"
      subtitle="Your tickets, and anything assigned to you."
      actions={<CreateTicketDialog />}
      state={state}
      errorProps={{ description: 'Failed to load tickets.', onRetry: () => refetch() }}
      emptyProps={{ icon: TicketIcon, title: 'No tickets', description: 'Submit one if something needs attention.' }}
    >
      {data && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{ticket.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/helpdesk/${ticket.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                      Open
                    </Link>
                  </TableCell>
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
