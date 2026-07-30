import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-16 text-center">
      <Icon className="mb-4 h-10 w-10 text-[var(--muted-foreground)]" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-[var(--muted-foreground)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
