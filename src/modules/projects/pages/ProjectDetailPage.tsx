import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { MilestoneList } from '../components/MilestoneList';
import { ProjectProgressBar } from '../components/ProjectProgressBar';
import { useTasks } from '../../tasks/hooks/useTasks';
import { TaskFormDialog } from '../../tasks/components/TaskFormDialog';
import { KanbanBoard } from '../../tasks/components/KanbanBoard';
import { TaskListTable } from '../../tasks/components/TaskListTable';
import { TaskCalendarView } from '../../tasks/components/TaskCalendarView';
import { TaskDetailDrawer } from '../../tasks/components/TaskDetailDrawer';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { DetailPageShell } from '../../../shared/components/layout/DetailPageShell';
import type { TaskRecord } from '../../tasks/types/task.types';

type Tab = 'board' | 'list' | 'calendar' | 'milestones';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('board');
  const [openTask, setOpenTask] = useState<TaskRecord | null>(null);
  const { data: project, isLoading, isError, refetch } = useProject(id);
  const { data: tasksData } = useTasks({ page: 1, limit: 100, projectId: id });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return <ErrorState description="Failed to load this project." onRetry={() => refetch()} />;
  }

  const tasks = tasksData?.data ?? [];

  return (
    <>
      <DetailPageShell
        maxWidth="6xl"
        breadcrumb={[{ label: 'Projects', to: '/projects' }, { label: project.name }]}
        title={project.name}
        subtitle={
          <div className="space-y-2">
            {project.description && <p>{project.description}</p>}
            {project.progress !== undefined && (
              <div className="flex items-center gap-3">
                <ProjectProgressBar value={project.progress} />
                <span>{project.openTasksCount ?? 0} open tasks</span>
              </div>
            )}
          </div>
        }
        actions={id ? <TaskFormDialog projectId={id} /> : undefined}
        activeTab={tab}
        onTabChange={(v) => setTab(v as Tab)}
        tabs={[
          { value: 'board', label: 'Board', content: <KanbanBoard tasks={tasks} onOpenTask={setOpenTask} /> },
          { value: 'list', label: 'List', content: <TaskListTable tasks={tasks} onOpenTask={setOpenTask} /> },
          { value: 'calendar', label: 'Calendar', content: <TaskCalendarView tasks={tasks} onOpenTask={setOpenTask} /> },
          { value: 'milestones', label: 'Milestones', content: id ? <MilestoneList projectId={id} /> : null },
        ]}
      />

      <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} />
    </>
  );
}
