import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useClient } from '../hooks/useCrm';
import { ContactDialog } from '../components/ContactDialog';
import { InvitePortalUserDialog } from '../components/InvitePortalUserDialog';
import { ActivityLog } from '../components/ActivityLog';
import { ClientStatusBadge } from '../components/CrmBadges';
import { Card } from '../../../shared/components/ui/card';
import { Badge } from '../../../shared/components/ui/badge';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading, isError, refetch } = useClient(id);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !client) return <ErrorState description="Failed to load this client." onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to="/crm/clients" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All clients
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{client.companyName}</h1>
          <ClientStatusBadge status={client.status} />
        </div>
        {id && <InvitePortalUserDialog clientId={id} clientName={client.companyName} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 lg:col-span-1">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Overview</h3>
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

          {(client.projects ?? []).length > 0 && (
            <div className="space-y-1 border-t border-[var(--border)] pt-3">
              <h4 className="text-xs font-bold text-[var(--foreground)]">Projects</h4>
              {(client.projects ?? []).map((project) => (
                <div key={project.id} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]">{project.name}</span>
                  <Badge variant="neutral">{project.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--foreground)]">Contacts</h3>
            {id && <ContactDialog clientId={id} />}
          </div>
          <ul className="space-y-2">
            {(client.contacts ?? []).map((contact) => (
              <li key={contact.id} className="rounded-lg border border-[var(--border)] p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--foreground)]">{contact.name}</span>
                  {contact.isPrimary && <Badge variant="info">Primary</Badge>}
                </div>
                <p className="text-[var(--muted-foreground)]">{contact.email}</p>
                {contact.designation && <p className="text-[var(--muted-foreground)]">{contact.designation}</p>}
              </li>
            ))}
            {(client.contacts ?? []).length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">No contacts yet.</p>
            )}
          </ul>
        </Card>

        <Card className="lg:col-span-1">{id && <ActivityLog clientId={id} />}</Card>
      </div>
    </div>
  );
}
