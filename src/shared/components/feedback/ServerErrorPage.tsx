import { ServerCrash } from 'lucide-react';
import { Button } from '../ui/button';

export function ServerErrorPage({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--destructive)]/10">
        <ServerCrash className="h-8 w-8 text-[var(--destructive)]" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Error 500</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
        An unexpected error occurred on our end. Try reloading the page — if it keeps happening, let us know.
      </p>
      <Button className="mt-6" onClick={onRetry ?? (() => window.location.reload())}>
        Reload page
      </Button>
    </div>
  );
}
