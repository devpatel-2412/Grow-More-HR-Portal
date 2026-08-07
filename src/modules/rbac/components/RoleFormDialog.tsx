import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePermissionCatalogue } from '../hooks/useRoles';
import { useCreateRole, useUpdateRole, useAssignPermission, useRemovePermission } from '../hooks/useRoleMutations';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Textarea } from '../../../shared/components/ui/textarea';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import type { Role } from '../types/rbac.types';

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

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Omit to create a new role; pass an existing role to edit it. */
  role?: Role;
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
  const isEdit = !!role;
  const { data: catalogue, isLoading: catalogueLoading } = usePermissionCatalogue();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const assignPermission = useAssignPermission();
  const removePermission = useRemovePermission();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setName(role?.name ?? '');
      setDescription(role?.description ?? '');
      setSelected(new Set(role?.permissions.map((p) => p.permission) ?? []));
      setError(undefined);
    }
  }, [open, role]);

  const isSystem = role?.isSystem ?? false;
  const isPending = createRole.isPending || updateRole.isPending || assignPermission.isPending || removePermission.isPending;

  function togglePermission(permission: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permission)) next.delete(permission);
      else next.add(permission);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      if (isEdit && role) {
        if (name !== role.name || description !== (role.description ?? '')) {
          await updateRole.mutateAsync({ id: role.id, values: { name, description } });
        }
        const before = new Set(role.permissions.map((p) => p.permission));
        const toAdd = [...selected].filter((p) => !before.has(p));
        const toRemove = [...before].filter((p) => !selected.has(p));
        for (const permission of toAdd) {
          await assignPermission.mutateAsync({ roleId: role.id, permission });
        }
        for (const permission of toRemove) {
          await removePermission.mutateAsync({ roleId: role.id, permission });
        }
        toast.success('Role updated.');
      } else {
        await createRole.mutateAsync({ name, description: description || undefined, permissions: [...selected] });
        toast.success('Role created.');
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit "${role.name}"` : 'Create role'}</DialogTitle>
          <DialogDescription>
            {isSystem
              ? 'This is a built-in system role — its permissions started as a copy of the static default, and can be adjusted here.'
              : 'Define a name and the permissions it grants. You can only grant permissions you yourself hold.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <InlineFormError message={error} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
            </div>
          </div>
          <div>
            <Label htmlFor="role-description">Description</Label>
            <Textarea id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} />
          </div>

          <div>
            <Label>Permissions</Label>
            {catalogueLoading && <p className="mt-1 text-sm text-[var(--muted-foreground)]">Loading permission catalogue…</p>}
            {catalogue && (
              <div className="mt-2 max-h-80 space-y-4 overflow-y-auto rounded-md border border-[var(--border)] p-3">
                {groupByResource(catalogue).map(([resource, permissions]) => (
                  <div key={resource}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{resource}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {permissions.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={selected.has(permission)} onCheckedChange={() => togglePermission(permission)} />
                          {permission}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" loading={isPending}>
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
