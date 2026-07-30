import { z } from 'zod';

export const LEAVE_TYPES = [
  'CASUAL',
  'SICK',
  'EARNED',
  'PAID',
  'UNPAID',
  'COMP_OFF',
  'MATERNITY',
  'PATERNITY',
  'WORK_FROM_HOME',
  'REMOTE_WORK',
] as const;

export const submitLeaveSchema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    startDate: z.string().min(1, 'Required'),
    endDate: z.string().min(1, 'Required'),
    isHalfDay: z.boolean(),
    reason: z.string().min(1, 'Please provide a reason').max(500),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });
export type SubmitLeaveFormValues = z.infer<typeof submitLeaveSchema>;
