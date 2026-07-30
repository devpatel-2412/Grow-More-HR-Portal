import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-6 py-16 text-center"
    >
      <AlertTriangle className="mb-4 h-10 w-10 text-[var(--destructive)]" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-[var(--muted-foreground)]">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function InlineFormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--destructive)]/40 bg-[var(--destructive)]/10 p-3 text-xs text-[var(--destructive)]"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
