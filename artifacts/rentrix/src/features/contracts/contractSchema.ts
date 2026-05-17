import { z } from 'zod';

const money = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? NaN : Number(value)),
  z.number({ invalid_type_error: 'قيمة الإيجار مطلوبة' }).positive('قيمة الإيجار يجب أن تكون أكبر من صفر'),
);

export const contractStatusValues = ['draft', 'active', 'expired', 'terminated'] as const;
export const paymentCycleValues = ['monthly', 'quarterly', 'semi_annual', 'annual'] as const;

export const contractStatusLabels: Record<(typeof contractStatusValues)[number], string> = {
  draft: 'مسودة',
  active: 'نشط',
  expired: 'منتهي',
  terminated: 'ملغي',
};

type ContractStatusTone = 'blue' | 'green' | 'red' | 'gray' | 'gold';

export const contractStatusTone: Record<(typeof contractStatusValues)[number], ContractStatusTone> = {
  draft: 'gray',
  active: 'green',
  expired: 'gold',
  terminated: 'red',
};

export const paymentCycleLabels: Record<(typeof paymentCycleValues)[number], string> = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  semi_annual: 'نصف سنوي',
  annual: 'سنوي',
};

export const contractSchema = z.object({
  property_id: z.string().uuid('اختر العقار'),
  unit_id: z.string().uuid('اختر الوحدة'),
  tenant_id: z.string().uuid('اختر المستأجر'),
  start_date: z.string().min(1, 'تاريخ البداية مطلوب'),
  end_date: z.string().min(1, 'تاريخ النهاية مطلوب'),
  rent_amount: money,
  payment_cycle: z.enum(paymentCycleValues, { required_error: 'دورة السداد مطلوبة' }),
  status: z.enum(contractStatusValues, { required_error: 'الحالة مطلوبة' }),
  cancellation_reason: z.string().trim().optional().transform((value) => value || null),
  notes: z.string().trim().optional().transform((value) => value || null),
}).refine((value) => value.end_date >= value.start_date, { path: ['end_date'], message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });

export const renewalSchema = z.object({
  new_start: z.string().min(1, 'تاريخ البداية مطلوب'),
  new_end: z.string().min(1, 'تاريخ النهاية مطلوب'),
  new_amount: money,
}).refine((value) => value.new_end >= value.new_start, { path: ['new_end'], message: 'تاريخ النهاية يجب أن يكون بعد البداية' });

export type ContractFormValues = z.input<typeof contractSchema>;
export type ContractPayload = z.output<typeof contractSchema>;
export type RenewalPayload = z.output<typeof renewalSchema>;
