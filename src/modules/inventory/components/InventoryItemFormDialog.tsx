import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { PackagePlus, Pencil } from 'lucide-react';
import { useCreateInventoryItem, useUpdateInventoryItem, useVendors } from '../hooks/useInventory';
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
import type { InventoryItemRecord } from '../types/inventory.types';

const NONE = '__none__';

const createSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  sku: z.string().min(1, 'Required').max(60),
  category: z.string().max(100).optional(),
  unit: z.string().min(1, 'Required').max(20),
  reorderLevel: z.number().int().min(0, 'Cannot be negative'),
  unitCost: z.number().min(0, 'Cannot be negative'),
  vendorId: z.string(),
  openingQuantity: z.number().int().min(0, 'Cannot be negative'),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = createSchema.omit({ sku: true, openingQuantity: true });
type EditFormValues = z.infer<typeof editSchema>;

interface CreateModeProps {
  mode: 'create';
}

interface EditModeProps {
  mode: 'edit';
  item: InventoryItemRecord;
}

export function InventoryItemFormDialog(props: CreateModeProps | EditModeProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === 'create' ? (
          <Button size="sm">
            <PackagePlus className="h-4 w-4" />
            New item
          </Button>
        ) : (
          <Button size="sm" variant="outline" aria-label={`Edit ${props.item.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        {props.mode === 'create' ? (
          <CreateItemForm onDone={() => setOpen(false)} />
        ) : (
          <EditItemForm item={props.item} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateItemForm({ onDone }: { onDone: () => void }) {
  const createMutation = useCreateInventoryItem();
  const { data: vendorPage } = useVendors({ page: 1, limit: 100 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', sku: '', category: '', unit: 'pcs', reorderLevel: 0, unitCost: 0, vendorId: NONE, openingQuantity: 0 },
  });

  async function onSubmit(values: CreateFormValues) {
    try {
      await createMutation.mutateAsync({
        ...values,
        category: values.category || undefined,
        vendorId: values.vendorId === NONE ? undefined : values.vendorId,
      });
      toast.success('Inventory item created.');
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create this item.' });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>New inventory item</DialogTitle>
        <DialogDescription>Opening quantity, if any, is recorded as the item's first stock-in.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="item-sku">SKU</Label>
            <Input id="item-sku" {...register('sku')} />
            {errors.sku && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.sku.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="item-category">Category</Label>
            <Input id="item-category" {...register('category')} />
          </div>
          <div>
            <Label htmlFor="item-unit">Unit</Label>
            <Input id="item-unit" placeholder="pcs, box, kg..." {...register('unit')} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="item-reorder">Reorder level</Label>
            <Input id="item-reorder" type="number" {...register('reorderLevel', { valueAsNumber: true })} />
          </div>
          <div>
            <Label htmlFor="item-cost">Unit cost</Label>
            <Input id="item-cost" type="number" step="0.01" {...register('unitCost', { valueAsNumber: true })} />
          </div>
          <div>
            <Label htmlFor="item-opening">Opening qty</Label>
            <Input id="item-opening" type="number" {...register('openingQuantity', { valueAsNumber: true })} />
          </div>
        </div>
        <div>
          <Label htmlFor="item-vendor">Preferred vendor</Label>
          <Controller
            control={control}
            name="vendorId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="item-vendor">
                  <SelectValue placeholder="No vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No vendor</SelectItem>
                  {(vendorPage?.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" loading={createMutation.isPending}>
            Create item
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function EditItemForm({ item, onDone }: { item: InventoryItemRecord; onDone: () => void }) {
  const updateMutation = useUpdateInventoryItem();
  const { data: vendorPage } = useVendors({ page: 1, limit: 100 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: item.name,
      category: item.category ?? '',
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      vendorId: item.vendorId ?? NONE,
    },
  });

  async function onSubmit(values: EditFormValues) {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        values: {
          ...values,
          category: values.category || undefined,
          vendorId: values.vendorId === NONE ? null : values.vendorId,
        },
      });
      toast.success('Inventory item updated.');
      onDone();
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to update this item.' });
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit {item.name}</DialogTitle>
        <DialogDescription>{item.sku}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <InlineFormError message={errors.root?.message} />
        <div>
          <Label htmlFor="edit-item-name">Name</Label>
          <Input id="edit-item-name" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-item-category">Category</Label>
            <Input id="edit-item-category" {...register('category')} />
          </div>
          <div>
            <Label htmlFor="edit-item-unit">Unit</Label>
            <Input id="edit-item-unit" {...register('unit')} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit-item-reorder">Reorder level</Label>
            <Input id="edit-item-reorder" type="number" {...register('reorderLevel', { valueAsNumber: true })} />
          </div>
          <div>
            <Label htmlFor="edit-item-cost">Unit cost</Label>
            <Input id="edit-item-cost" type="number" step="0.01" {...register('unitCost', { valueAsNumber: true })} />
          </div>
        </div>
        <div>
          <Label htmlFor="edit-item-vendor">Preferred vendor</Label>
          <Controller
            control={control}
            name="vendorId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="edit-item-vendor">
                  <SelectValue placeholder="No vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No vendor</SelectItem>
                  {(vendorPage?.data ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" loading={updateMutation.isPending}>
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
