import { z } from 'zod';

export const regularizationRequestSchema = z
  .object({
    date: z.string().min(1, 'Required'),
    requestedCheckIn: z.string().optional().or(z.literal('')),
    requestedCheckOut: z.string().optional().or(z.literal('')),
    reason: z.string().min(1, 'Please explain what needs correcting').max(500),
  })
  .refine((data) => data.requestedCheckIn || data.requestedCheckOut, {
    message: 'Provide a corrected check-in or check-out time',
    path: ['requestedCheckIn'],
  });
export type RegularizationRequestFormValues = z.infer<typeof regularizationRequestSchema>;

export const attendancePolicySchema = z.object({
  shiftStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM, e.g. 09:30'),
  requiredWorkHours: z.number().min(1, 'Must be at least 1 hour').max(24),
  allowedBreakMinutes: z.number().min(0).max(480),
  breakOverageExtendsLogout: z.boolean(),
});
export type AttendancePolicyFormValues = z.infer<typeof attendancePolicySchema>;

export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
