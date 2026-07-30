import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProject } from '../hooks/useProjects';
import { MilestoneList } from '../components/MilestoneList';
import { useTasks } from '../../tasks/hooks/useTasks';
import { TaskFormDialog } from '../../tasks/components/TaskFormDialog';
import { KanbanBoard } from '../../tasks/components/KanbanBoard';
import { TaskListTable } from '../../tasks/components/TaskListTable';
import { TaskCalendarView } from '../../tasks/components/TaskCalendarView';
import { TaskDetailDrawer } from '../../tasks/components/TaskDetailDrawer';
import { Card } from '../../../shared/components/ui/card';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { cn } from '../../../shared/utils/cn';
import type { TaskRecord } from '../../tasks/types/task.types';

const TABS = ['board', 'list', 'calendar', 'milestones'] as const;
type Tab = (typeof TABS)[number];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('board');
  const [openTask, setOpenTask] = useState<TaskRecord | null>(null);
  const { data: project, isLoading, isError, refetch } = useProject(id);
  const { data: tasksData } = useTasks({ page: 1, limit: 100, projectId: id });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link to="/projects" className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-3.5 w-3.5" />
          Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{project.name}</h1>
            {project.description && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{project.description}</p>}
          </div>
          {id && <TaskFormDialog projectId={id} />}
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-xs font-semibold capitalize transition-colors',
              tab === t
                ? 'border-b-2 border-[var(--primary)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        {tab === 'board' && <KanbanBoard tasks={tasks} onOpenTask={setOpenTask} />}
        {tab === 'list' && <TaskListTable tasks={tasks} onOpenTask={setOpenTask} />}
        {tab === 'calendar' && <TaskCalendarView tasks={tasks} onOpenTask={setOpenTask} />}
        {tab === 'milestones' && id && <MilestoneList projectId={id} />}
      </Card>

      <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} />
    </div>
  );
}
