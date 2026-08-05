import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', {
  variants: {
    variant: {
      neutral: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
      success: 'bg-green-500/15 text-green-600',
      warning: 'bg-amber-500/15 text-amber-600',
      danger: 'bg-[var(--destructive)]/15 text-[var(--destructive)]',
      info: 'bg-sky-500/15 text-sky-600',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
