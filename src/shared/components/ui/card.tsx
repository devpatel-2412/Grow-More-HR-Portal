import * as React from 'react';
import { cn } from '../../utils/cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('glass-panel rounded-2xl p-6 shadow-2xl', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-6 flex flex-col items-center text-center', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'bg-gradient-to-r from-indigo-200 via-slate-100 to-indigo-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent',
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm text-[var(--muted-foreground)]', className)} {...props} />;
}
