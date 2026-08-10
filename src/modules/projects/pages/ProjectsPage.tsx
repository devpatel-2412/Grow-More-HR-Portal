import { FolderKanban } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { usePagination } from '../../../shared/hooks/usePagination';
import { ProjectFormDialog } from '../components/ProjectFormDialog';
import { ProjectCard } from '../components/ProjectCard';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function ProjectsPage() {
  const pagination = usePagination(20);
  const { data, isLoading, isError, refetch } = useProjects({
    page: pagination.page,
    limit: pagination.limit,
    search: pagination.debouncedSearch || undefined,
  });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Projects"
      subtitle="Track projects, milestones, and their tasks."
      maxWidth="6xl"
      actions={<ProjectFormDialog />}
      filters={
        <Input
          value={pagination.search}
          onChange={(e) => pagination.setSearch(e.target.value)}
          placeholder="Search projects..."
          aria-label="Search projects"
          className="max-w-xs"
        />
      }
      state={state}
      wrapContent={false}
      errorProps={{ description: 'Failed to load projects.', onRetry: () => refetch() }}
      emptyProps={{ icon: FolderKanban, title: 'No projects yet', description: 'Create your first project to get started.' }}
    >
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
