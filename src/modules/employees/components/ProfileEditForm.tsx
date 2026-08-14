import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { toast } from 'sonner';
import { employeeApi } from '../api/employee.api';
import type { EmployeeListItem } from '../types/employee.types';

const profileSchema = z.object({
  phone: z.string().max(30).optional(),
  address: z.string().max(250).optional(),
  emergencyContact: z.string().max(100).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditFormProps {
  employee: EmployeeListItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProfileEditForm({ employee, onSuccess, onCancel }: ProfileEditFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: employee.phone || '',
      address: employee.address || '',
      emergencyContact: employee.emergencyContact || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      setIsSubmitting(true);
      await employeeApi.updateProfile(data);
      toast.success('Profile updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl border border-[var(--border)] p-4">
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" {...register('phone')} className="mt-1" placeholder="+1 234 567 8900" />
        {errors.phone && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.phone.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input id="address" {...register('address')} className="mt-1" placeholder="123 Main St, City, Country" />
        {errors.address && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.address.message}</p>}
      </div>

      <div>
        <Label htmlFor="emergencyContact">Emergency Contact</Label>
        <Input
          id="emergencyContact"
          {...register('emergencyContact')}
          className="mt-1"
          placeholder="Jane Doe (Spouse) - +1 234 567 8901"
        />
        {errors.emergencyContact && (
          <p className="mt-1 text-xs text-[var(--destructive)]">{errors.emergencyContact.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
