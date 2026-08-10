import { Link } from 'react-router-dom';
import { BriefcaseBusiness } from 'lucide-react';
import { useJobPostings } from '../hooks/useRecruitment';
import { usePagination } from '../../../shared/hooks/usePagination';
import { JobPostingDialog } from '../components/JobPostingDialog';
import { JobPostingStatusBadge } from '../components/RecruitmentBadges';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function JobPostingsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useJobPostings({ page: pagination.page, limit: pagination.limit });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Recruitment"
      subtitle="Open roles and the candidates in each pipeline."
      actions={<JobPostingDialog />}
      state={state}
      errorProps={{ description: 'Failed to load job postings.', onRetry: () => refetch() }}
      emptyProps={{ icon: BriefcaseBusiness, title: 'No job postings yet', description: 'Create your first posting to start tracking candidates.' }}
    >
      {data && (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Openings</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((posting) => (
                <TableRow key={posting.id}>
                  <TableCell className="font-medium">{posting.title}</TableCell>
                  <TableCell>{posting.department}</TableCell>
                  <TableCell>{posting.location}</TableCell>
                  <TableCell className="text-right tabular-nums">{posting.openings}</TableCell>
                  <TableCell>
                    <JobPostingStatusBadge status={posting.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/recruitment/${posting.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                      Pipeline
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
