import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva('inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', {
  variants: {
    variant: {
      neutral: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
      success: 'bg-emerald-500/15 text-emerald-500',
      warning: 'bg-amber-500/15 text-amber-500',
      danger: 'bg-[var(--destructive)]/15 text-[var(--destructive)]',
      info: 'bg-indigo-500/15 text-indigo-400',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
