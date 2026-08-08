import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { createCompanySchema, type CreateCompanyFormValues } from '../schemas/tenant.schemas';
import { useCreateTenant } from '../hooks/useCreateTenant';
import { ApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { InlineFormError } from '../../../shared/components/feedback/ErrorState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../../shared/components/ui/dialog';

export function CreateCompanyDialog() {
  const [open, setOpen] = useState(false);
  const createTenant = useCreateTenant();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<CreateCompanyFormValues>({ resolver: zodResolver(createCompanySchema) });

  async function onSubmit(values: CreateCompanyFormValues) {
    try {
      await createTenant.mutateAsync(values);
      toast.success(`${values.name} created — an activation email was sent to ${values.adminEmail}.`);
      reset();
      setOpen(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unable to create company.';
      setError('root', { message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Building2 className="h-4 w-4" />
          New company
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a company</DialogTitle>
          <DialogDescription>
            This creates the workspace and sends its first administrator an email to activate their account. There is no
            other way to add a new company or its first user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />
          <div>
            <Label htmlFor="company-name">Company name</Label>
            <Input id="company-name" autoComplete="off" placeholder="Acme Inc" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="company-domain">Domain</Label>
            <Input id="company-domain" autoComplete="off" placeholder="acme" {...register('domain')} />
            {errors.domain && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.domain.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-first-name">Admin first name</Label>
              <Input id="admin-first-name" autoComplete="off" {...register('adminFirstName')} />
              {errors.adminFirstName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.adminFirstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="admin-last-name">Admin last name</Label>
              <Input id="admin-last-name" autoComplete="off" {...register('adminLastName')} />
              {errors.adminLastName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.adminLastName.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="admin-email">Admin email</Label>
            <Input id="admin-email" type="email" autoComplete="off" placeholder="admin@acme.com" {...register('adminEmail')} />
            {errors.adminEmail && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.adminEmail.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" loading={createTenant.isPending}>
              Create company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
