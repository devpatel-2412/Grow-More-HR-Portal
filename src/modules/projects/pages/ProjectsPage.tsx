import { FolderKanban, FolderX } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import { usePagination } from '../../../shared/hooks/usePagination';
import { ProjectFormDialog } from '../components/ProjectFormDialog';
import { ProjectTable } from '../components/ProjectTable';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { Input } from '../../../shared/components/ui/input';
import { PaginationBar } from '../../../shared/components/ui/pagination';
import { ListPage } from '../../../shared/components/layout/ListPage';

export function ProjectsPage() {
  const pagination = usePagination(20);
  const canManage = useHasPermission('project:manage');
  const { data, isLoading, isError, refetch } = useProjects({
    page: pagination.page,
    limit: pagination.limit,
    search: pagination.debouncedSearch || undefined,
  });
  const state = isLoading ? 'loading' : isError ? 'error' : !data || data.data.length === 0 ? 'empty' : 'ready';

  return (
    <ListPage
      title="Projects"
      subtitle={canManage ? 'Track projects, milestones, and their tasks.' : 'Projects you have tasks assigned in.'}
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
      errorProps={{ description: 'Failed to load projects.', onRetry: () => refetch() }}
      emptyProps={
        pagination.debouncedSearch
          ? { icon: FolderX, title: 'No matching projects', description: 'Try a different search term.' }
          : canManage
            ? { icon: FolderKanban, title: 'No projects yet', description: 'Create your first project to get started.' }
            : {
                icon: FolderX,
                title: 'No projects assigned',
                description: "You don't currently have any projects assigned to you.",
              }
      }
    >
      {data && (
        <div className="space-y-4">
          <ProjectTable projects={data.data} />
          <PaginationBar meta={data.meta} onPageChange={pagination.setPage} />
        </div>
      )}
    </ListPage>
  );
}
