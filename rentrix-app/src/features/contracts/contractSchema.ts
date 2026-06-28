import { z } from 'zod';

const money = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? NaN : Number(value)),
  z.number({ invalid_type_error: 'قيمة الإيجار مطلوبة' }).positive('قيمة الإيجار يجب أن تكون أكبر من صفر'),
);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'التاريخ يجب أن يكون بصيغة YYYY-MM-DD')
  .refine((value) => {
    const parsedDate = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
  }, 'أدخل تاريخًا صحيحًا');

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
  agreement_id: z.string().uuid('لا توجد اتفاقية مالك تغطي فترة العقد').optional().nullable(),
  start_date: isoDate,
  end_date: isoDate,
  rent_amount: money,
  payment_cycle: z.enum(paymentCycleValues, { required_error: 'دورة السداد مطلوبة' }),
  payment_terms_id: z.string().uuid('اختر شرط سداد صحيح').or(z.literal('')).optional().transform((value) => value || null),
  status: z.enum(contractStatusValues, { required_error: 'الحالة مطلوبة' }),
  cancellation_reason: z.string().trim().optional().transform((value) => value || null),
  notes: z.string().trim().optional().transform((value) => value || null),
  attachment_url: z.string().nullable().optional(),
}).refine((value) => value.end_date > value.start_date, { path: ['end_date'], message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' });

export const renewalSchema = z.object({
  new_start: isoDate,
  new_end: isoDate,
  new_amount: money,
}).refine((value) => value.new_end > value.new_start, { path: ['new_end'], message: 'تاريخ النهاية يجب أن يكون بعد البداية' });

export type ContractFormValues = z.input<typeof contractSchema>;
export type ContractPayload = z.output<typeof contractSchema>;
export type RenewalPayload = z.output<typeof renewalSchema>;
