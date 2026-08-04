import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--destructive)]/10">
        <ShieldAlert className="h-8 w-8 text-[var(--destructive)]" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Error 403</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--foreground)]">Access denied</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">
        You don't have permission to view this page. If you think this is a mistake, contact your administrator.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
