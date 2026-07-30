import { Link } from 'react-router-dom';
import { Badge } from '../../../shared/components/ui/badge';
import { Card } from '../../../shared/components/ui/card';
import type { ProjectRecord, ProjectStatus } from '../types/project.types';

const STATUS_VARIANT: Record<ProjectStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  PLANNING: 'neutral',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export function ProjectCard({ project }: { project: ProjectRecord }) {
  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="glass-panel-hover h-full">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{project.name}</h3>
          <Badge variant={STATUS_VARIANT[project.status]}>{project.status.replace('_', ' ')}</Badge>
        </div>
        {project.description && <p className="mb-3 line-clamp-2 text-xs text-[var(--muted-foreground)]">{project.description}</p>}
        <p className="text-[10px] text-[var(--muted-foreground)]">
          {new Date(project.startDate).toLocaleDateString()}
          {project.endDate && ` – ${new Date(project.endDate).toLocaleDateString()}`}
        </p>
      </Card>
    </Link>
  );
}
