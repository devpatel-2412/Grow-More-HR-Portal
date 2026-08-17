import { useState, useMemo } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, FilePlus2 } from 'lucide-react';
import {
  createFinanceDocumentFormSchema,
  FINANCE_TYPES,
  type CreateFinanceDocumentFormValues,
} from '../schemas/finance.schemas';
import { useCreateFinanceDocument } from '../hooks/useFinance';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
import { TYPE_LABEL } from './FinanceBadges';
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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CreateFinanceDocumentDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateFinanceDocument();
  const canManage = useHasPermission('finance:manage');
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<CreateFinanceDocumentFormValues>({
    resolver: zodResolver(createFinanceDocumentFormSchema),
    defaultValues: {
      type: 'INVOICE',
      issueDate: today(),
      dueDate: '',
      taxRate: 0,
      placeOfSupplyStateCode: '',
      notes: '',
      lineItems: [{ description: '', hsnCode: '', quantity: 1, unitPrice: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  // useWatch (not the plain `watch()` method) is the reliable reactive subscription — it
  // re-renders this component on every keystroke in a tracked field, which the running totals
  // below depend on.
  const lineItems = useWatch({ control, name: 'lineItems' });
  const taxRate = useWatch({ control, name: 'taxRate' });

  const { subtotal, taxAmount, total } = useMemo(() => {
    const sub = lineItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    const tax = sub * ((taxRate || 0) / 100);
    return { subtotal: sub, taxAmount: tax, total: sub + tax };
  }, [lineItems, taxRate]);

  if (!canManage) return null;

  async function onSubmit(values: CreateFinanceDocumentFormValues) {
    try {
      await createMutation.mutateAsync({
        type: values.type,
        issueDate: values.issueDate,
        dueDate: values.dueDate || undefined,
        taxRate: values.taxRate,
        placeOfSupplyStateCode: values.placeOfSupplyStateCode || undefined,
        notes: values.notes.trim() || undefined,
        lineItems: values.lineItems.map((item) => ({ ...item, hsnCode: item.hsnCode || undefined })),
      });
      toast.success('Document created as a draft.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create this document.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" />
          New document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New finance document</DialogTitle>
          <DialogDescription>Starts as a draft — nothing is sent or billed until you send it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="doc-type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="doc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="doc-issue">Issue date</Label>
              <Input id="doc-issue" type="date" {...register('issueDate')} />
              {errors.issueDate && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.issueDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="doc-due">Due date</Label>
              <Input id="doc-due" type="date" {...register('dueDate')} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => append({ description: '', hsnCode: '', quantity: 1, unitPrice: 0 })}
              >
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_90px_80px_100px_32px] items-start gap-2">
                <div>
                  <Input placeholder="Description" {...register(`lineItems.${index}.description`)} />
                  {errors.lineItems?.[index]?.description && (
                    <p className="mt-1 text-xs text-[var(--destructive)]">{errors.lineItems[index]?.description?.message}</p>
                  )}
                </div>
                <Input placeholder="HSN/SAC" {...register(`lineItems.${index}.hsnCode`)} />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit price"
                  {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label="Remove line item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {errors.lineItems?.root && <p className="text-xs text-[var(--destructive)]">{errors.lineItems.root.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="doc-tax">Tax rate (%)</Label>
                <Input id="doc-tax" type="number" step="0.01" {...register('taxRate', { valueAsNumber: true })} />
              </div>
              <div>
                <Label htmlFor="doc-pos">Place of supply (GST state code)</Label>
                <Input id="doc-pos" placeholder="e.g. 27" maxLength={2} {...register('placeOfSupplyStateCode')} />
              </div>
            </div>
            <div className="space-y-1 rounded-lg bg-[var(--muted)] p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Subtotal</span>
                <span className="font-medium text-[var(--foreground)]">{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Tax</span>
                <span className="font-medium text-[var(--foreground)]">{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-1 font-bold text-[var(--foreground)]">
                <span>Total</span>
                <span>{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="doc-notes">Notes</Label>
            <Textarea id="doc-notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
