import type { ReactNode } from 'react';
import { Card } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

const MAX_WIDTH_CLASS = {
  '3xl': 'max-w-3xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
} as const;

export interface DetailPageTab {
  value: string;
  label: string;
  content: ReactNode;
}

export interface DetailPageShellProps {
  breadcrumb: BreadcrumbItem[];
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  /** e.g. a status-change button or a create-task dialog trigger. */
  actions?: ReactNode;
  tabs?: DetailPageTab[];
  activeTab?: string;
  onTabChange?: (value: string) => void;
  /** Non-tabbed pages (e.g. TicketDetailPage) render their body here instead of `tabs`. */
  children?: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH_CLASS;
  /** Set false when `children` already builds its own Card(s) (most non-tabbed detail pages do — multiple sibling cards, not one blob) so it isn't nested inside a redundant extra Card. */
  wrapContent?: boolean;
}

/** The shared shell for the ~7 detail pages (EmployeeDetail, ProjectDetail, TicketDetail, ...). */
export function DetailPageShell({
  breadcrumb,
  title,
  subtitle,
  badge,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
  maxWidth = '6xl',
  wrapContent = false,
}: DetailPageShellProps) {
  return (
    <div className={`mx-auto ${MAX_WIDTH_CLASS[maxWidth]} space-y-6`}>
      <div className="space-y-2">
        <Breadcrumbs items={breadcrumb} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">{title}</h1>
              {badge}
            </div>
            {subtitle && <div className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</div>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>

      {tabs && tabs.length > 0 && activeTab && onTabChange ? (
        <>
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Card className="mt-4">
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value}>
                  {tab.content}
                </TabsContent>
              ))}
            </Card>
          </Tabs>
        </>
      ) : wrapContent ? (
        <Card>{children}</Card>
      ) : (
        children
      )}
    </div>
  );
}
