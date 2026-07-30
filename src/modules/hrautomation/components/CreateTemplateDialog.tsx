import { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Plus, Trash2, FilePlus2 } from 'lucide-react';
import { useCreateTemplate } from '../hooks/useHrAutomation';
import { POSTER_TYPES, TEMPLATE_VARIABLES } from '../types/hrautomation.types';
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

const TEMPLATE_TYPES = ['POSTER_WELCOME', 'POSTER_BIRTHDAY', 'POSTER_PROMOTION', 'LETTER_OFFER', 'LETTER_EXPERIENCE', 'LETTER_RELIEVING'] as const;

const fieldSchema = z.object({
  id: z.string(),
  variableKey: z.enum(TEMPLATE_VARIABLES),
  x: z.number().min(0),
  y: z.number().min(0),
});

const templateSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  type: z.enum(TEMPLATE_TYPES),
  backgroundUrl: z.string(),
  bodyTemplate: z.string(),
  fields: z.array(fieldSchema),
});
type TemplateFormValues = z.infer<typeof templateSchema>;

export function CreateTemplateDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateTemplate();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    reset,
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: '', type: 'LETTER_OFFER', backgroundUrl: '', bodyTemplate: '', fields: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });
  const type = watch('type');
  const isPoster = useMemo(() => POSTER_TYPES.includes(type), [type]);

  async function onSubmit(values: TemplateFormValues) {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        type: values.type,
        backgroundUrl: isPoster ? values.backgroundUrl : undefined,
        layoutFields: isPoster
          ? values.fields.map((f) => ({ id: f.id, variableKey: f.variableKey, x: f.x, y: f.y, fontSize: 16, color: '#000000', fontWeight: 'normal' as const }))
          : undefined,
        bodyTemplate: isPoster ? undefined : values.bodyTemplate,
      });
      toast.success('Template created.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to create this template.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FilePlus2 className="h-4 w-4" />
          New template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>
            Posters place text over a background image; letters fill a body of text. Use{' '}
            <code>{'{{variableName}}'}</code> in a letter body.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tpl-name">Name</Label>
              <Input id="tpl-name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="tpl-type">Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tpl-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {isPoster ? (
            <>
              <div>
                <Label htmlFor="tpl-bg">Background image URL</Label>
                <Input id="tpl-bg" placeholder="https://…" {...register('backgroundUrl')} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Text fields</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => append({ id: crypto.randomUUID(), variableKey: 'firstName', x: 0, y: 0 })}
                  >
                    <Plus className="h-4 w-4" />
                    Add field
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-[1fr_80px_80px_32px] items-center gap-2">
                    <Controller
                      control={control}
                      name={`fields.${index}.variableKey`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger aria-label="Variable">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_VARIABLES.map((v) => (
                              <SelectItem key={v} value={v}>
                                {v}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Input type="number" placeholder="X" {...register(`fields.${index}.x`, { valueAsNumber: true })} />
                    <Input type="number" placeholder="Y" {...register(`fields.${index}.y`, { valueAsNumber: true })} />
                    <Button type="button" size="icon" variant="ghost" onClick={() => remove(index)} aria-label="Remove field">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="tpl-body">Body</Label>
              <Textarea
                id="tpl-body"
                rows={8}
                placeholder="Dear {{firstName}} {{lastName}}, …"
                {...register('bodyTemplate')}
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Available: {TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(', ')}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Create template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
