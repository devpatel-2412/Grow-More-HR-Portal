import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { PackagePlus } from 'lucide-react';
import { useCreateAsset } from '../hooks/useWorkplace';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
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

const ASSET_TYPES = ['LAPTOP', 'DESKTOP', 'PHONE', 'SIM', 'ID_CARD', 'SOFTWARE_LICENSE', 'VEHICLE', 'OTHER'] as const;

const assetSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  serialNumber: z.string().min(1, 'Required').max(120),
  type: z.enum(ASSET_TYPES),
});
type AssetFormValues = z.infer<typeof assetSchema>;

export function CreateAssetDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateAsset();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { name: '', serialNumber: '', type: 'LAPTOP' },
  });

  async function onSubmit(values: AssetFormValues) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('Asset added.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to add this asset.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PackagePlus className="h-4 w-4" />
          New asset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New asset</DialogTitle>
          <DialogDescription>Starts available in the pool, ready to assign.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="asset-serial">Serial number</Label>
            <Input id="asset-serial" {...register('serialNumber')} />
            {errors.serialNumber && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.serialNumber.message}</p>}
          </div>

          <div>
            <Label htmlFor="asset-type">Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Add asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
