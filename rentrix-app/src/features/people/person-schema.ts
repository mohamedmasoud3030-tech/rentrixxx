import { z } from 'zod';

export const personTypeValues = ['tenant', 'owner', 'contact'] as const;

export const personTypeLabels: Record<(typeof personTypeValues)[number], string> = {
  tenant: 'مستأجر',
  owner: 'مالك',
  contact: 'جهة اتصال',
};

export const personSchema = z.object({
  full_name: z.string().trim().min(2, 'الاسم الكامل مطلوب'),
  phone: z.string().trim().optional().transform((value) => value || null),
  email: z.string().trim().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')).transform((value) => value || null),
  national_id: z.string().trim().optional().transform((value) => value || null),
  type: z.enum(personTypeValues, { required_error: 'النوع مطلوب' }),
  address: z.string().trim().optional().transform((value) => value || null),
  notes: z.string().trim().optional().transform((value) => value || null),
});

export type PersonFormValues = z.input<typeof personSchema>;
export type PersonPayload = z.output<typeof personSchema>;
