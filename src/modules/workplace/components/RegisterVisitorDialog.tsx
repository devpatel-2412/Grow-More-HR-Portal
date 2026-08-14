import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { useRegisterVisitor } from '../hooks/useWorkplace';
import { useEmployees } from '../../employees/hooks/useEmployees';
import { useHasPermission } from '../../auth/hooks/useHasPermission';
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

function nowLocalInput(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const visitorSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Required').max(40),
  hostEmployeeId: z.string().min(1, 'Pick a host'),
  purpose: z.string().min(1, 'Required').max(500),
  expectedAt: z.string().min(1, 'Required'),
});
type VisitorFormValues = z.infer<typeof visitorSchema>;

export function RegisterVisitorDialog() {
  const [open, setOpen] = useState(false);
  const registerMutation = useRegisterVisitor();
  const canManage = useHasPermission('visitor:manage');
  const { data: employeePage } = useEmployees({ page: 1, limit: 100 });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorSchema),
    defaultValues: { name: '', email: '', phone: '', hostEmployeeId: '', purpose: '', expectedAt: nowLocalInput() },
  });

  if (!canManage) return null;

  async function onSubmit(values: VisitorFormValues) {
    try {
      await registerMutation.mutateAsync({ ...values, expectedAt: new Date(values.expectedAt).toISOString() });
      toast.success('Visitor registered.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to register this visitor.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" />
          Register visitor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a visitor</DialogTitle>
          <DialogDescription>Starts as expected — check them in when they arrive.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visitor-name">Name</Label>
              <Input id="visitor-name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="visitor-phone">Phone</Label>
              <Input id="visitor-phone" {...register('phone')} />
              {errors.phone && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="visitor-email">Email</Label>
            <Input id="visitor-email" type="email" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="visitor-host">Host</Label>
            <Controller
              control={control}
              name="hostEmployeeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="visitor-host">
                    <SelectValue placeholder="Who are they visiting?" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employeePage?.data ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.hostEmployeeId && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.hostEmployeeId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visitor-purpose">Purpose</Label>
              <Input id="visitor-purpose" {...register('purpose')} />
              {errors.purpose && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.purpose.message}</p>}
            </div>
            <div>
              <Label htmlFor="visitor-expected">Expected at</Label>
              <Input id="visitor-expected" type="datetime-local" {...register('expectedAt')} />
              {errors.expectedAt && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.expectedAt.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" loading={registerMutation.isPending}>
              Register
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
