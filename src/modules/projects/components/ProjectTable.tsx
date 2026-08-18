import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../../../shared/components/ui/data-table';
import { ProjectFormDialog } from './ProjectFormDialog';
import { ProjectProgressBar } from './ProjectProgressBar';
import { useDeleteProject } from '../hooks/useProjects';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Avatar } from '../../../shared/components/ui/avatar';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import type { ProjectMemberSummary, ProjectRecord, ProjectStatus } from '../types/project.types';

const STATUS_VARIANT: Record<ProjectStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PLANNING: 'neutral',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

function formatDateRange(startDate: string, endDate: string | null): string {
  const start = new Date(startDate).toLocaleDateString();
  return endDate ? `${start} – ${new Date(endDate).toLocaleDateString()}` : start;
}

function MemberAvatars({ members }: { members: ProjectMemberSummary[] }) {
  if (members.length === 0) return <span className="text-[var(--muted-foreground)]">—</span>;
  const shown = members.slice(0, 4);
  const overflow = members.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <Avatar key={m.id} name={`${m.firstName} ${m.lastName}`} size="sm" className="ring-2 ring-[var(--card)]" />
      ))}
      {overflow > 0 && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-[10px] font-bold text-[var(--muted-foreground)] ring-2 ring-[var(--card)]">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function ProjectNameCell({ project }: { project: ProjectRecord }) {
  return (
    <Link to={`/projects/${project.id}`} className="block hover:text-[var(--primary)]">
      <div className="font-semibold text-[var(--foreground)]">{project.name}</div>
      {project.description && <div className="line-clamp-1 text-[var(--muted-foreground)]">{project.description}</div>}
    </Link>
  );
}

/**
 * Renders two distinct column sets from the same component, switched on `project:manage` (never a
 * role check) — the full manager view (progress, open tasks, members, edit/delete) versus the
 * limited view for anyone without it (their own open-task count, no client/financial detail, no
 * mutating actions). Both are permission-driven, not employee-specific special-casing.
 */
export function ProjectTable({ projects }: { projects: ProjectRecord[] }) {
  const canManage = useHasPermission('project:manage');
  const deleteMutation = useDeleteProject();

  async function handleDelete(project: ProjectRecord) {
    if (!window.confirm(`Delete "${project.name}"? This also removes its tasks and milestones. This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(project.id);
      toast.success('Project deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to delete this project.');
    }
  }

  const managerColumns: DataTableColumn<ProjectRecord>[] = [
    {
      id: 'name',
      header: 'Project',
      alwaysVisible: true,
      csvValue: (p) => p.name,
      cell: (p) => <ProjectNameCell project={p} />,
    },
    {
      id: 'id',
      header: 'Project ID',
      csvValue: (p) => p.id,
      cell: (p) => <span className="text-[var(--muted-foreground)]">{p.id.slice(0, 8)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      csvValue: (p) => p.status,
      cell: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{p.status.replace('_', ' ')}</Badge>,
    },
    {
      id: 'progress',
      header: 'Progress',
      csvValue: (p) => `${p.progress ?? 0}%`,
      cell: (p) => <ProjectProgressBar value={p.progress ?? 0} />,
    },
    {
      id: 'openTasks',
      header: 'Open tasks',
      csvValue: (p) => String(p.openTasksCount ?? 0),
      cell: (p) => <span>{p.openTasksCount ?? 0}</span>,
    },
    {
      id: 'members',
      header: 'Members',
      cell: (p) => <MemberAvatars members={p.members ?? []} />,
    },
    {
      id: 'dates',
      header: 'Dates',
      csvValue: (p) => formatDateRange(p.startDate, p.endDate),
      cell: (p) => <span className="whitespace-nowrap text-[var(--muted-foreground)]">{formatDateRange(p.startDate, p.endDate)}</span>,
    },
    // Omitted entirely (not just emptied) when the user can't manage projects — no dangling column.
    ...(canManage
      ? [
          {
            id: 'actions',
            header: 'Actions',
            className: 'text-right',
            cell: (p) => (
              <div className="flex justify-end gap-1">
                <Button asChild size="icon" variant="ghost" aria-label={`View ${p.name}`}>
                  <Link to={`/projects/${p.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                <ProjectFormDialog mode="edit" project={p} />
                <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => handleDelete(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<ProjectRecord>,
        ]
      : []),
  ];

  const limitedColumns: DataTableColumn<ProjectRecord>[] = [
    {
      id: 'name',
      header: 'Project',
      alwaysVisible: true,
      csvValue: (p) => p.name,
      cell: (p) => <ProjectNameCell project={p} />,
    },
    {
      id: 'status',
      header: 'Status',
      csvValue: (p) => p.status,
      cell: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{p.status.replace('_', ' ')}</Badge>,
    },
    {
      id: 'progress',
      header: 'Progress',
      csvValue: (p) => `${p.progress ?? 0}%`,
      cell: (p) => <ProjectProgressBar value={p.progress ?? 0} />,
    },
    {
      id: 'myOpenTasks',
      header: 'My open tasks',
      csvValue: (p) => String(p.myOpenTasksCount ?? 0),
      cell: (p) => <span>{p.myOpenTasksCount ?? 0}</span>,
    },
    {
      id: 'dates',
      header: 'Dates',
      csvValue: (p) => formatDateRange(p.startDate, p.endDate),
      cell: (p) => <span className="whitespace-nowrap text-[var(--muted-foreground)]">{formatDateRange(p.startDate, p.endDate)}</span>,
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (p) => (
        <Button asChild size="sm" variant="outline" aria-label={`View ${p.name}`}>
          <Link to={`/projects/${p.id}`}>
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
        </Button>
      ),
    },
  ];

  const columns = canManage ? managerColumns : limitedColumns;

  return (
    <DataTable
      tableId={canManage ? 'projects-manager' : 'projects-limited'}
      columns={columns}
      rows={projects}
      getRowId={(p) => p.id}
      exportFilename="projects"
      mobileCard={(p) => (
        <div className="space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <ProjectNameCell project={p} />
            <Badge variant={STATUS_VARIANT[p.status]}>{p.status.replace('_', ' ')}</Badge>
          </div>
          <ProjectProgressBar value={p.progress ?? 0} />
          <div className="flex items-center justify-between text-[var(--muted-foreground)]">
            <span>{canManage ? `${p.openTasksCount ?? 0} open tasks` : `${p.myOpenTasksCount ?? 0} of my tasks open`}</span>
            <span className="whitespace-nowrap">{formatDateRange(p.startDate, p.endDate)}</span>
          </div>
          {canManage && (p.members?.length ?? 0) > 0 && <MemberAvatars members={p.members ?? []} />}
          <div className="flex justify-end gap-1 pt-1">
            <Button asChild size="sm" variant="outline" aria-label={`View ${p.name}`}>
              <Link to={`/projects/${p.id}`}>
                <Eye className="h-3.5 w-3.5" />
                View
              </Link>
            </Button>
            {canManage && (
              <>
                <ProjectFormDialog mode="edit" project={p} />
                <Button size="icon" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => handleDelete(p)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    />
  );
}
