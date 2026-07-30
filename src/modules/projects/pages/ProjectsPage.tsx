import { FolderKanban } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { usePagination } from '../../../shared/hooks/usePagination';
import { ProjectFormDialog } from '../components/ProjectFormDialog';
import { ProjectCard } from '../components/ProjectCard';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ProjectsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useProjects({
    page: pagination.page,
    limit: pagination.limit,
    search: pagination.debouncedSearch || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Projects</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Track projects, milestones, and their tasks.</p>
        </div>
        <ProjectFormDialog />
      </div>

      <Input
        value={pagination.search}
        onChange={(e) => pagination.setSearch(e.target.value)}
        placeholder="Search projects..."
        aria-label="Search projects"
        className="max-w-xs"
      />

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {isError && <ErrorState description="Failed to load projects." onRetry={() => refetch()} />}
      {!isLoading && !isError && data && data.data.length === 0 && (
        <EmptyState icon={FolderKanban} title="No projects yet" description="Create your first project to get started." />
      )}
      {!isLoading && !isError && data && data.data.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </div>
  );
}
