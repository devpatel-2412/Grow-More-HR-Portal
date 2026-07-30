import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { CalendarPlus } from 'lucide-react';
import { useCreateRoomBooking } from '../hooks/useWorkplace';
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

function nowLocalInput(offsetMinutes = 0): string {
  const now = new Date(Date.now() + offsetMinutes * 60000);
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const bookingSchema = z
  .object({
    roomName: z.string().min(1, 'Required').max(120),
    startTime: z.string().min(1, 'Required'),
    endTime: z.string().min(1, 'Required'),
    purpose: z.string().min(1, 'Required').max(500),
  })
  .refine((data) => data.endTime > data.startTime, { message: 'End time must be after the start time', path: ['endTime'] });
type BookingFormValues = z.infer<typeof bookingSchema>;

export function CreateBookingDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreateRoomBooking();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    reset,
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { roomName: '', startTime: nowLocalInput(), endTime: nowLocalInput(60), purpose: '' },
  });

  async function onSubmit(values: BookingFormValues) {
    try {
      await createMutation.mutateAsync({
        roomName: values.roomName,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
        purpose: values.purpose,
      });
      toast.success('Room booked.');
      reset();
      setOpen(false);
    } catch (err) {
      setError('root', { message: err instanceof ApiError ? err.message : 'Unable to book this room.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarPlus className="h-4 w-4" />
          Book a room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book a room</DialogTitle>
          <DialogDescription>Rejected if the room is already booked for any part of this time.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <InlineFormError message={errors.root?.message} />

          <div>
            <Label htmlFor="booking-room">Room</Label>
            <Input id="booking-room" {...register('roomName')} />
            {errors.roomName && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.roomName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="booking-start">Start</Label>
              <Input id="booking-start" type="datetime-local" {...register('startTime')} />
              {errors.startTime && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.startTime.message}</p>}
            </div>
            <div>
              <Label htmlFor="booking-end">End</Label>
              <Input id="booking-end" type="datetime-local" {...register('endTime')} />
              {errors.endTime && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.endTime.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="booking-purpose">Purpose</Label>
            <Input id="booking-purpose" {...register('purpose')} />
            {errors.purpose && <p className="mt-1 text-xs text-[var(--destructive)]">{errors.purpose.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" loading={createMutation.isPending}>
              Book
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
