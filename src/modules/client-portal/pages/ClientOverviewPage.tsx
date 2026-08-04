import { useOwnClientProfile } from '../hooks/useClientPortal';
import { Card } from '../../../shared/components/ui/card';
import { Badge } from '../../../shared/components/ui/badge';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ClientOverviewPage() {
  const { data: client, isLoading, isError, refetch } = useOwnClientProfile();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !client) return <ErrorState description="Failed to load your account." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{client.companyName}</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your account overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Company details</h3>
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="font-semibold text-[var(--muted-foreground)]">Email</dt>
              <dd className="text-[var(--foreground)]">{client.contactEmail}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted-foreground)]">Phone</dt>
              <dd className="text-[var(--foreground)]">{client.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted-foreground)]">Industry</dt>
              <dd className="text-[var(--foreground)]">{client.industry ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--muted-foreground)]">Website</dt>
              <dd className="text-[var(--foreground)]">{client.website ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Contacts</h3>
          <ul className="space-y-2">
            {client.contacts.map((contact) => (
              <li key={contact.id} className="rounded-lg border border-[var(--border)] p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--foreground)]">{contact.name}</span>
                  {contact.isPrimary && <Badge variant="info">Primary</Badge>}
                </div>
                <p className="text-[var(--muted-foreground)]">{contact.email}</p>
              </li>
            ))}
            {client.contacts.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">No contacts on file.</p>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
