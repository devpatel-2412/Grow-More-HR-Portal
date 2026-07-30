import { z } from 'zod';

export const FINANCE_TYPES = ['QUOTATION', 'INVOICE', 'EXPENSE', 'BILL'] as const;

export const lineItemFormSchema = z.object({
  description: z.string().min(1, 'Required').max(500),
  quantity: z.number().min(0.01, 'Must be at least 0.01'),
  unitPrice: z.number().min(0, 'Cannot be negative'),
});

export const createFinanceDocumentFormSchema = z.object({
  type: z.enum(FINANCE_TYPES),
  issueDate: z.string().min(1, 'Required'),
  dueDate: z.string(),
  taxRate: z.number().min(0).max(100),
  notes: z.string(),
  lineItems: z.array(lineItemFormSchema).min(1, 'Add at least one line item'),
});
export type CreateFinanceDocumentFormValues = z.infer<typeof createFinanceDocumentFormSchema>;

export const recordPaymentFormSchema = z.object({
  amount: z.number().min(0.01, 'Must be at least 0.01'),
  paidAt: z.string().min(1, 'Required'),
  method: z.string().min(1, 'Required').max(120),
  reference: z.string(),
});
export type RecordPaymentFormValues = z.infer<typeof recordPaymentFormSchema>;
