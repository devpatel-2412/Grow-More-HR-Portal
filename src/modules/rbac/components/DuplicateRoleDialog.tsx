import { useState } from 'react';
import { toast } from 'sonner';
import { useDuplicateRole } from '../hooks/useRoleMutations';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../shared/components/ui/dialog';
import type { Role } from '../types/rbac.types';

export function DuplicateRoleDialog({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role: Role }) {
  const [name, setName] = useState(`${role.name} (copy)`);
  const [error, setError] = useState<string | undefined>();
  const duplicateRole = useDuplicateRole();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      await duplicateRole.mutateAsync({ id: role.id, name });
      toast.success('Role duplicated.');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to duplicate role.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate "{role.name}"</DialogTitle>
          <DialogDescription>Creates a new role with the same permissions, which you can then adjust independently.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <InlineFormError message={error} />
          <div>
            <Label htmlFor="duplicate-name">New role name</Label>
            <Input id="duplicate-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoFocus />
          </div>
          <DialogFooter>
            <Button type="submit" loading={duplicateRole.isPending}>
              Duplicate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
