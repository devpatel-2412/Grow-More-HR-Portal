import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { ArrowDownToLine, ArrowUpFromLine, Sliders } from 'lucide-react';
import { useStockIn, useStockOut, useAdjustStock, useVendors } from '../hooks/useInventory';
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

// ---------------------------------------------------------------- stock in

const stockInSchema = z.object({ quantity: z.number().int().positive('Must be at least 1'), vendorId: z.string(), reference: z.string().max(200).optional() });

export function StockInDialog({ item }: { item: InventoryItemRecord }) {
  const [open, setOpen] = useState(false);
  const mutation = useStockIn(item.id);
  const { data: vendorPage } = useVendors({ page: 1, limit: 100 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<z.infer<typeof stockInSchema>>({
    resolver: zodResolver(stockInSchema),
    defaultValues: { quantity: 1, vendorId: item.vendorId ?? NONE },
  });

  async function onSubmit(values: z.infer<typeof stockInSchema>) {
    try {
      await mutation.mutateAsync({ quantity: values.quantity, reference: values.reference, vendorId: values.vendorId === NONE ? undefined : values.vendorId });
      toast.success('Stock received.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to record this stock-in.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Stock in ${item.name}`}>
          <ArrowDownToLine className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock in: {item.name}</DialogTitle>
          <DialogDescription>Currently {item.quantityOnHand} {item.unit} on hand.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="stockin-qty">Quantity received</Label>
            <Input id="stockin-qty" type="number" {...register('quantity', { valueAsNumber: true })} />
            {errors.quantity && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.quantity.message}</p>}
          </div>
          <div>
            <Label htmlFor="stockin-vendor">Vendor</Label>
            <Controller
              control={control}
              name="vendorId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="stockin-vendor">
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
          <div>
            <Label htmlFor="stockin-ref">Reference</Label>
            <Input id="stockin-ref" placeholder="PO number, invoice..." {...register('reference')} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={mutation.isPending}>
              Record stock-in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- stock out

const stockOutSchema = z.object({ quantity: z.number().int().positive('Must be at least 1'), reference: z.string().max(200).optional() });

export function StockOutDialog({ item }: { item: InventoryItemRecord }) {
  const [open, setOpen] = useState(false);
  const mutation = useStockOut(item.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<z.infer<typeof stockOutSchema>>({ resolver: zodResolver(stockOutSchema), defaultValues: { quantity: 1 } });

  async function onSubmit(values: z.infer<typeof stockOutSchema>) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Stock issued.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to record this stock-out.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Stock out ${item.name}`} disabled={item.quantityOnHand === 0}>
          <ArrowUpFromLine className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock out: {item.name}</DialogTitle>
          <DialogDescription>Currently {item.quantityOnHand} {item.unit} on hand.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="stockout-qty">Quantity issued</Label>
            <Input id="stockout-qty" type="number" {...register('quantity', { valueAsNumber: true })} />
            {errors.quantity && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.quantity.message}</p>}
          </div>
          <div>
            <Label htmlFor="stockout-ref">Reference</Label>
            <Input id="stockout-ref" placeholder="Issued to, purpose..." {...register('reference')} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={mutation.isPending}>
              Record stock-out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- adjust

const adjustSchema = z.object({ quantity: z.number().int().refine((v) => v !== 0, 'Adjustment cannot be zero'), reference: z.string().max(200).optional() });

export function AdjustStockDialog({ item }: { item: InventoryItemRecord }) {
  const [open, setOpen] = useState(false);
  const mutation = useAdjustStock(item.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<z.infer<typeof adjustSchema>>({ resolver: zodResolver(adjustSchema), defaultValues: { quantity: 0 } });

  async function onSubmit(values: z.infer<typeof adjustSchema>) {
    try {
      await mutation.mutateAsync(values);
      toast.success('Stock adjusted.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to adjust this item.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Adjust ${item.name}`}>
          <Sliders className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock: {item.name}</DialogTitle>
          <DialogDescription>
            A signed correction — currently {item.quantityOnHand} {item.unit}. Use a negative number to reduce, positive to increase.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="adjust-qty">Adjustment</Label>
            <Input id="adjust-qty" type="number" {...register('quantity', { valueAsNumber: true })} />
            {errors.quantity && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.quantity.message}</p>}
          </div>
          <div>
            <Label htmlFor="adjust-ref">Reason</Label>
            <Input id="adjust-ref" placeholder="Damaged, miscounted..." {...register('reference')} />
          </div>
          <DialogFooter>
            <Button type="submit" loading={mutation.isPending}>
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
