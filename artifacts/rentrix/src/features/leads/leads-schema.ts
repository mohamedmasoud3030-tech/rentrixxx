import { z } from 'zod';

export const leadStatusValues = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;
export const leadStatusLabels: Record<(typeof leadStatusValues)[number], string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  won: 'تم التحويل',
  lost: 'مفقود',
};

export const leadSchema = z.object({
  full_name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().nullable().optional(),
  email: z.string().email('صيغة البريد غير صحيحة').nullable().optional().or(z.literal('')),
  source: z.string().nullable().optional(),
  status: z.enum(leadStatusValues),
  notes: z.string().nullable().optional(),
  assigned_to: z.preprocess((value) => value === '' ? null : value, z.string().uuid().nullable().optional()),
});

export type LeadPayload = z.infer<typeof leadSchema>;
