import { Badge } from '../../../shared/components/ui/badge';
import type { TaskPriority } from '../types/task.types';

const PRIORITY_VARIANT: Record<TaskPriority, 'success' | 'warning' | 'danger' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'success',
  HIGH: 'warning',
  CRITICAL: 'danger',
};

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}
