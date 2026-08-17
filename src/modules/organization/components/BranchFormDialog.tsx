import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Building2, Pencil } from 'lucide-react';
import { useCreateBranch, useUpdateBranch } from '../hooks/useOrganization';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '../../../shared/components/ui/dialog';
import type { BranchRecord } from '../types/organization.types';

const branchSchema = z.object({
  name: z.string().min(1, 'Required').max(120),
  code: z.string().min(1, 'Required').max(20),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  isHeadOffice: z.boolean(),
});
type BranchFormValues = z.infer<typeof branchSchema>;

interface CreateModeProps {
  mode: 'create';
}

interface EditModeProps {
  mode: 'edit';
  branch: BranchRecord;
}

export function BranchFormDialog(props: CreateModeProps | EditModeProps) {
  const [open, setOpen] = useState(false);
  const canManage = useHasPermission('org:manage');

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === 'create' ? (
          <Button size="sm">
            <Building2 className="h-4 w-4" />
            New branch
          </Button>
        ) : (
          <Button size="sm" variant="outline" aria-label={`Edit ${props.branch.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <BranchForm branch={props.mode === 'edit' ? props.branch : undefined} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function BranchForm({ branch, onDone }: { branch?: BranchRecord; onDone: () => void }) {
  const createMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: branch?.name ?? '',
      code: branch?.code ?? '',
      address: branch?.address ?? '',
      city: branch?.city ?? '',
      state: branch?.state ?? '',
      country: branch?.country ?? '',
      isHeadOffice: branch?.isHeadOffice ?? false,
    },
  });

  async function onSubmit(values: BranchFormValues) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: branch.id, values });
        toast.success('Branch updated.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Branch created.');
      }
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save this branch.' });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? `Edit ${branch.name}` : 'New branch'}</DialogTitle>
        <DialogDescription>A physical office or site employees and teams can be assigned to.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="branch-name">Name</Label>
            <Input id="branch-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="branch-code">Code</Label>
            <Input id="branch-code" placeholder="HQ" {...register('code')} />
            {errors.code && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.code.message}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="branch-address">Address</Label>
          <Input id="branch-address" {...register('address')} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="branch-city">City</Label>
            <Input id="branch-city" {...register('city')} />
          </div>
          <div>
            <Label htmlFor="branch-state">State</Label>
            <Input id="branch-state" {...register('state')} />
          </div>
          <div>
            <Label htmlFor="branch-country">Country</Label>
            <Input id="branch-country" {...register('country')} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <Checkbox
            checked={watch('isHeadOffice')}
            onCheckedChange={(checked) => setValue('isHeadOffice', checked === true)}
          />
          Head office
        </label>
        <DialogFooter>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create branch'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
