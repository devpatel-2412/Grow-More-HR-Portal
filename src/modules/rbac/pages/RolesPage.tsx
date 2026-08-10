import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { useRoles, usePermissionCatalogue } from '../hooks/useRoles';
import { useAssignPermission, useRemovePermission } from '../hooks/useRoleMutations';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import { cn } from '../../../shared/utils/cn';
import type { UserRole } from '../../auth/types/auth.types';

// Exactly 6 fixed roles, in hierarchy order — nothing else is ever shown on this page, and no UI
// here can create, rename, or delete a role. SUPER_ADMIN has no DB row (its access is hardcoded,
// never DB-driven — see permission-resolver.service.ts) so it's rendered as a synthetic, locked
// entry; the other 5 are backed by the tenant's seeded system Role rows.
const ROLE_ORDER: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  HR_MANAGER: 'HR Manager',
  PROJECT_MANAGER: 'Project Manager',
  TEAM_LEADER: 'Team Leader',
  EMPLOYEE: 'Employee',
};

function groupByResource(permissions: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>();
  for (const permission of permissions) {
    const resource = permission.split(':')[0];
    const list = groups.get(resource) ?? [];
    list.push(permission);
    groups.set(resource, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

export function RolesPage() {
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch } = useRoles();
  const { data: catalogue, isLoading: catalogueLoading } = usePermissionCatalogue();
  const assignPermission = useAssignPermission();
  const removePermission = useRemovePermission();

  const [selectedRoleName, setSelectedRoleName] = useState<UserRole>('SUPER_ADMIN');
  const [staged, setStaged] = useState<Set<string> | null>(null);

  // Room Bookings were removed from the app entirely — the backend table/permissions stay, but
  // SUPER_ADMIN never manages them from this page.
  const displayCatalogue = useMemo(() => (catalogue ?? []).filter((p) => !p.startsWith('roombooking:')), [catalogue]);

  const isSuperAdmin = selectedRoleName === 'SUPER_ADMIN';
  const dbRole = roles?.find((r) => r.name === selectedRoleName);
  const persisted = useMemo(() => new Set(dbRole?.permissions.map((p) => p.permission) ?? []), [dbRole]);
  const current = isSuperAdmin ? new Set(displayCatalogue) : (staged ?? persisted);
  const dirty = !isSuperAdmin && staged !== null && !setsEqual(staged, persisted);
  const saving = assignPermission.isPending || removePermission.isPending;

  function selectRole(name: UserRole) {
    setSelectedRoleName(name);
    setStaged(null);
  }

  function togglePermission(permission: string) {
    if (isSuperAdmin || !dbRole) return;
    setStaged((prev) => {
      const next = new Set(prev ?? persisted);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function handleSave() {
    if (!dbRole || !staged) return;
    const toAdd = [...staged].filter((p) => !persisted.has(p));
    const toRemove = [...persisted].filter((p) => !staged.has(p));
    try {
      for (const permission of toAdd) {
        await assignPermission.mutateAsync({ roleId: dbRole.id, permission });
      }
      for (const permission of toRemove) {
        await removePermission.mutateAsync({ roleId: dbRole.id, permission });
      }
      toast.success(`Permissions updated for ${ROLE_LABELS[selectedRoleName]}.`);
      setStaged(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save permissions.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Super Admin always has full access. For the other 5 roles, decide exactly what they can see and do.
          </p>
        </div>
        <Badge variant="info">6 Roles</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <nav className="space-y-1">
            {ROLE_ORDER.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => selectRole(name)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                  selectedRoleName === name
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]',
                )}
              >
                {name === 'SUPER_ADMIN' && <ShieldCheck className="h-4 w-4 shrink-0" />}
                {ROLE_LABELS[name]}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">Role: {ROLE_LABELS[selectedRoleName]}</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {isSuperAdmin
                ? 'Super Admin always has full platform access. This cannot be reduced or disabled.'
                : 'Toggle the permissions this role should have, then save.'}
            </p>
          </div>

          {(rolesLoading || catalogueLoading) && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          {rolesError && <ErrorState description="Failed to load roles." onRetry={() => refetch()} />}

          {!rolesLoading && !catalogueLoading && !rolesError && !isSuperAdmin && !dbRole && (
            <p className="text-sm text-[var(--muted-foreground)]">
              This role hasn't been initialized for your company yet. Run the RBAC seed to enable it.
            </p>
          )}

          {!rolesLoading && !catalogueLoading && !rolesError && (isSuperAdmin || dbRole) && (
            <>
              <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-md border border-[var(--border)] p-3">
                {groupByResource(displayCatalogue).map(([resource, permissions]) => (
                  <div key={resource}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{resource}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {permissions.map((permission) => (
                        <label key={permission} className={cn('flex items-center gap-2 text-sm', isSuperAdmin && 'opacity-70')}>
                          <Checkbox
                            checked={current.has(permission)}
                            disabled={isSuperAdmin}
                            onCheckedChange={() => togglePermission(permission)}
                          />
                          {permission}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!isSuperAdmin && (
                <div className="flex justify-end">
                  <Button type="button" onClick={handleSave} disabled={!dirty} loading={saving}>
                    Save Changes
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
