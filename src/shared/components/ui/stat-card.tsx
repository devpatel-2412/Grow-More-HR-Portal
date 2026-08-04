import type { ComponentType } from 'react';
import { Card } from './card';
import { cn } from '../../utils/cn';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  tone?: 'default' | 'success' | 'danger';
  sublabel?: string;
}

const TONE_CLASS: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-[var(--foreground)]',
  success: 'text-emerald-500',
  danger: 'text-[var(--destructive)]',
};

export function StatCard({ label, value, icon: Icon, tone = 'default', sublabel }: StatCardProps) {
  return (
    <Card className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />}
      </div>
      <p className={cn('text-2xl font-extrabold tabular-nums', TONE_CLASS[tone])}>{value}</p>
      {sublabel && <p className="text-xs text-[var(--muted-foreground)]">{sublabel}</p>}
    </Card>
  );
}
