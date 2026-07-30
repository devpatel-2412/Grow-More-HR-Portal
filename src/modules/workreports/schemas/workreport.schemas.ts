import { z } from 'zod';

/** The form collects each list as one textarea; blank lines are dropped when splitting. */
export const submitWorkReportSchema = z.object({
  date: z.string().min(1, 'Required'),
  completedTasks: z.string().min(1, 'List at least one thing you completed'),
  pendingTasks: z.string(),
  tomorrowPlan: z.string(),
  issues: z.string(),
  timeSpentMinutes: z.number().int().min(0, 'Cannot be negative').max(1440, 'A day only has 1440 minutes'),
});

export type SubmitWorkReportFormValues = z.infer<typeof submitWorkReportSchema>;

export function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}
