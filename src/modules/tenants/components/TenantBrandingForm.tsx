import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateTenantSchema, type UpdateTenantFormValues } from '../schemas/tenant.schemas';
import { useUpdateTenant } from '../hooks/useUpdateTenant';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import type { Tenant } from '../../auth/types/auth.types';

export function TenantBrandingForm({ tenant }: { tenant: Tenant }) {
  const updateMutation = useUpdateTenant(tenant.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<UpdateTenantFormValues>({
    resolver: zodResolver(updateTenantSchema),
    defaultValues: {
      name: tenant.name,
      logoUrl: tenant.logoUrl ?? '',
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      font: tenant.font,
    },
  });

  async function onSubmit(values: UpdateTenantFormValues) {
    try {
      await updateMutation.mutateAsync(values);
      toast.success('Workspace settings saved.');
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save settings.' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <InlineFormError message={errors.root?.message} />
      <div>
        <Label htmlFor="tenant-name">Organization name</Label>
        <Input id="tenant-name" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="tenant-logo">Logo URL</Label>
        <Input id="tenant-logo" placeholder="https://..." {...register('logoUrl')} />
        {errors.logoUrl && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.logoUrl.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tenant-primary">Primary color</Label>
          <Input id="tenant-primary" placeholder="#6366f1" {...register('primaryColor')} />
          {errors.primaryColor && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.primaryColor.message}</p>}
        </div>
        <div>
          <Label htmlFor="tenant-secondary">Secondary color</Label>
          <Input id="tenant-secondary" placeholder="#ec4899" {...register('secondaryColor')} />
          {errors.secondaryColor && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.secondaryColor.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="tenant-font">Font</Label>
        <Input id="tenant-font" {...register('font')} />
        {errors.font && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.font.message}</p>}
      </div>
      <Button type="submit" loading={updateMutation.isPending}>
        Save settings
      </Button>
    </form>
  );
}
