import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../ui/card';
import { Skeleton } from '../feedback/LoadingSkeleton';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorState } from '../feedback/ErrorState';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

const MAX_WIDTH_CLASS = {
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
} as const;

export interface ListPageProps {
  title: string;
  subtitle?: string;
  breadcrumb?: BreadcrumbItem[];
  /** e.g. a create-dialog trigger — rendered in the header, unchanged from what the page already builds. */
  actions?: ReactNode;
  /** e.g. search input / selects — rendered as a toolbar row above the content. */
  filters?: ReactNode;
  state: 'loading' | 'error' | 'empty' | 'ready';
  errorProps?: { description?: string; onRetry?: () => void };
  emptyProps?: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode };
  maxWidth?: keyof typeof MAX_WIDTH_CLASS;
  /** The page's existing table/list + <PaginationBar/>, rendered only when state === 'ready'. */
  children?: ReactNode;
  /** Set false for card-grid pages (e.g. Projects) where nesting the grid inside another Card would double up borders/shadows. Loading/error/empty states still render, just unwrapped. */
  wrapContent?: boolean;
}

/**
 * The shared shell for the ~30 list-shaped pages (Employees, Attendance, Leave, Projects, ...).
 * Every page keeps its own data hooks/mutations/dialogs untouched — only the wrapper JSX changes.
 */
export function ListPage({
  title,
  subtitle,
  breadcrumb,
  actions,
  filters,
  state,
  errorProps,
  emptyProps,
  maxWidth = '5xl',
  children,
  wrapContent = true,
}: ListPageProps) {
  const body = (
    <>
      {filters && <div className={wrapContent ? 'mb-4 flex flex-wrap items-center gap-2' : 'flex flex-wrap items-center gap-2'}>{filters}</div>}

      {state === 'loading' && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {state === 'error' && <ErrorState description={errorProps?.description ?? 'Failed to load.'} onRetry={errorProps?.onRetry} />}

      {state === 'empty' && emptyProps && (
        <EmptyState icon={emptyProps.icon} title={emptyProps.title} description={emptyProps.description} action={emptyProps.action} />
      )}

      {state === 'ready' && children}
    </>
  );

  return (
    <div className={`mx-auto ${MAX_WIDTH_CLASS[maxWidth]} space-y-6`}>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumbs items={breadcrumb} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {wrapContent ? (
        <Card>{body}</Card>
      ) : (
        <div className={filters ? 'space-y-4' : undefined}>{body}</div>
      )}
    </div>
  );
}
