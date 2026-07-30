import { Link } from 'react-router-dom';
import { BriefcaseBusiness } from 'lucide-react';
import { useJobPostings } from '../hooks/useRecruitment';
import { usePagination } from '../../../shared/hooks/usePagination';
import { JobPostingDialog } from '../components/JobPostingDialog';
import { JobPostingStatusBadge } from '../components/RecruitmentBadges';
import { Card } from '../../../shared/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function JobPostingsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useJobPostings({ page: pagination.page, limit: pagination.limit });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Recruitment</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Open roles and the candidates in each pipeline.</p>
        </div>
        <JobPostingDialog />
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <ErrorState description="Failed to load job postings." onRetry={() => refetch()} />}
        {!isLoading && !isError && data && data.data.length === 0 && (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No job postings yet"
            description="Create your first posting to start tracking candidates."
          />
        )}
        {!isLoading && !isError && data && data.data.length > 0 && (
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
                      <Link
                        to={`/recruitment/${posting.id}`}
                        className="text-sm font-medium text-[var(--primary)] hover:underline"
                      >
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
      </Card>
    </div>
  );
}
