import * as React from 'react';
import { cn } from '../../utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-[var(--destructive)] aria-[invalid=true]:focus:ring-[var(--destructive)]',
        className,
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';
