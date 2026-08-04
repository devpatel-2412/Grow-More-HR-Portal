import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { useUpdateTenant } from '../hooks/useUpdateTenant';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import type { Tenant } from '../../auth/types/auth.types';

const taxSettingsSchema = z.object({
  gstin: z.string().max(20).optional().or(z.literal('')),
  gstStateCode: z.string().length(2, 'Use the 2-digit GST state code').optional().or(z.literal('')),
});
type TaxSettingsFormValues = z.infer<typeof taxSettingsSchema>;

export function TaxSettingsForm({ tenant }: { tenant: Tenant }) {
  const updateMutation = useUpdateTenant(tenant.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<TaxSettingsFormValues>({
    resolver: zodResolver(taxSettingsSchema),
    defaultValues: {
      gstin: tenant.gstin ?? '',
      gstStateCode: tenant.gstStateCode ?? '',
    },
  });

  async function onSubmit(values: TaxSettingsFormValues) {
    try {
      await updateMutation.mutateAsync({
        name: tenant.name,
        logoUrl: tenant.logoUrl ?? '',
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        font: tenant.font,
        gstin: values.gstin,
        gstStateCode: values.gstStateCode,
      });
      toast.success('Tax settings saved.');
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save tax settings.' });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <InlineFormError message={errors.root?.message} />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tax-gstin">GSTIN</Label>
          <Input id="tax-gstin" placeholder="27ABCDE1234F1Z5" {...register('gstin')} />
          {errors.gstin && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.gstin.message}</p>}
        </div>
        <div>
          <Label htmlFor="tax-state-code">GST state code</Label>
          <Input id="tax-state-code" placeholder="e.g. 27" maxLength={2} {...register('gstStateCode')} />
          {errors.gstStateCode && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.gstStateCode.message}</p>}
        </div>
      </div>
      <p className="text-[10px] text-[var(--muted-foreground)]">
        When set, an invoice's tax splits into CGST/SGST when its place of supply matches this state, or IGST when
        it doesn't.
      </p>
      <Button type="submit" loading={updateMutation.isPending}>
        Save tax settings
      </Button>
    </form>
  );
}
