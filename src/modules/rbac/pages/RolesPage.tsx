import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Pencil, Copy, Trash2 } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { useDeleteRole } from '../hooks/useRoleMutations';
import { RoleFormDialog } from '../components/RoleFormDialog';
import { DuplicateRoleDialog } from '../components/DuplicateRoleDialog';
import { ApiError } from '../../../shared/lib/api-client';
import { Card } from '../../../shared/components/ui/card';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../shared/components/ui/table';
import { EmptyState } from '../../../shared/components/feedback/EmptyState';
import { ErrorState } from '../../../shared/components/feedback/ErrorState';
import { Skeleton } from '../../../shared/components/feedback/LoadingSkeleton';
import type { Role } from '../types/rbac.types';

export function RolesPage() {
  const { data: roles, isLoading, isError, refetch } = useRoles();
  const deleteRole = useDeleteRole();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const [duplicatingRole, setDuplicatingRole] = useState<Role | undefined>();

  async function handleDelete(role: Role) {
    if (!window.confirm(`Delete the role "${role.name}"? This can't be undone.`)) return;
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success('Role deleted.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete role.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create custom roles and assign fine-grained permissions on top of the built-in staff roles.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create role
        </Button>
      </div>

      <Card>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState description="Failed to load roles." onRetry={() => refetch()} />}

        {!isLoading && !isError && roles && roles.length === 0 && (
          <EmptyState icon={ShieldCheck} title="No roles yet" description="Create your first custom role to get started." />
        )}

        {!isLoading && !isError && roles && roles.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-semibold">{role.name}</TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">{role.description || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={role.isSystem ? 'info' : 'neutral'}>{role.isSystem ? 'System' : 'Custom'}</Badge>
                  </TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingRole(role)}
                        className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicatingRole(role)}
                        className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </button>
                      {!role.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDelete(role)}
                          className="inline-flex items-center gap-1 text-[var(--destructive)] hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <RoleFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editingRole && (
        <RoleFormDialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(undefined)} role={editingRole} />
      )}
      {duplicatingRole && (
        <DuplicateRoleDialog open={!!duplicatingRole} onOpenChange={(open) => !open && setDuplicatingRole(undefined)} role={duplicatingRole} />
      )}
    </div>
  );
}
