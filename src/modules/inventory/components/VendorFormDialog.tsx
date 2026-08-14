import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Truck, Pencil } from 'lucide-react';
import { useCreateVendor, useUpdateVendor } from '../hooks/useInventory';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Textarea } from '../../../shared/components/ui/textarea';
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../shared/components/ui/select';
import type { VendorRecord } from '../types/inventory.types';

const vendorSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  contactName: z.string().max(120).optional(),
  email: z.string().max(200).optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  gstNumber: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
type VendorFormValues = z.infer<typeof vendorSchema>;

interface CreateModeProps {
  mode: 'create';
}

interface EditModeProps {
  mode: 'edit';
  vendor: VendorRecord;
}

export function VendorFormDialog(props: CreateModeProps | EditModeProps) {
  const [open, setOpen] = useState(false);
  const canManage = useHasPermission('vendor:manage');

  if (!canManage) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === 'create' ? (
          <Button size="sm">
            <Truck className="h-4 w-4" />
            New vendor
          </Button>
        ) : (
          <Button size="sm" variant="outline" aria-label={`Edit ${props.vendor.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <VendorForm vendor={props.mode === 'edit' ? props.vendor : undefined} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function VendorForm({ vendor, onDone }: { vendor?: VendorRecord; onDone: () => void }) {
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const isEdit = !!vendor;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: vendor?.name ?? '',
      contactName: vendor?.contactName ?? '',
      email: vendor?.email ?? '',
      phone: vendor?.phone ?? '',
      address: vendor?.address ?? '',
      gstNumber: vendor?.gstNumber ?? '',
      notes: vendor?.notes ?? '',
      status: vendor?.status ?? 'ACTIVE',
    },
  });

  async function onSubmit(values: VendorFormValues) {
    const payload = {
      ...values,
      contactName: values.contactName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      gstNumber: values.gstNumber || undefined,
      notes: values.notes || undefined,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: vendor.id, values: payload });
        toast.success('Vendor updated.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Vendor created.');
      }
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to save this vendor.' });
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? `Edit ${vendor.name}` : 'New vendor'}</DialogTitle>
        <DialogDescription>A supplier inventory items can be purchased from.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor-name">Name</Label>
            <Input id="vendor-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="vendor-contact">Contact name</Label>
            <Input id="vendor-contact" {...register('contactName')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor-email">Email</Label>
            <Input id="vendor-email" type="email" {...register('email')} />
          </div>
          <div>
            <Label htmlFor="vendor-phone">Phone</Label>
            <Input id="vendor-phone" {...register('phone')} />
          </div>
        </div>
        <div>
          <Label htmlFor="vendor-address">Address</Label>
          <Input id="vendor-address" {...register('address')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendor-gst">GST number</Label>
            <Input id="vendor-gst" {...register('gstNumber')} />
          </div>
          {isEdit && (
            <div>
              <Label htmlFor="vendor-status">Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="vendor-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="vendor-notes">Notes</Label>
          <Textarea id="vendor-notes" rows={2} {...register('notes')} />
        </div>
        <DialogFooter>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create vendor'}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
