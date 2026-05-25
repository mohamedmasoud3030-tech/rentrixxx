import type { OwnerAgreementTerm, OwnerAgreementType } from './ownerAgreementTypes';

type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

export type OwnerAgreementDraftInput = {
  owner_id: string;
  property_id: string;
  agreement_type: OwnerAgreementType;
  starts_on: string;
  ends_on?: string | null;
  payout_day?: number | null;
  min_payout_amount?: number | null;
};

const rateFields: Array<keyof OwnerAgreementTerm> = ['office_commission_rate', 'owner_share_rate', 'profit_share_rate'];
const amountFields: Array<keyof OwnerAgreementTerm> = [
  'fixed_owner_payout_amount',
  'fixed_management_fee_amount',
  'guaranteed_minimum_amount',
  'upside_threshold_amount',
];

const requiredTermFieldsByAgreementType: Record<OwnerAgreementType, Array<Readonly<{ field: keyof OwnerAgreementTerm; message: string }>>> = {
  percentage_of_gross_collections: [{ field: 'owner_share_rate', message: 'نسبة حصة المالك مطلوبة' }],
  percentage_of_net_collections: [{ field: 'owner_share_rate', message: 'نسبة حصة المالك مطلوبة' }],
  fixed_owner_payout: [{ field: 'fixed_owner_payout_amount', message: 'قيمة الصرف الثابت مطلوبة' }],
  fixed_management_fee: [{ field: 'fixed_management_fee_amount', message: 'قيمة عمولة الإدارة الثابتة مطلوبة' }],
  guaranteed_minimum_plus_percentage: [
    { field: 'guaranteed_minimum_amount', message: 'الحد الأدنى المضمون مطلوب' },
    { field: 'owner_share_rate', message: 'نسبة حصة المالك مطلوبة' },
  ],
  fixed_plus_profit_share: [
    { field: 'fixed_owner_payout_amount', message: 'قيمة الصرف الثابت مطلوبة' },
    { field: 'profit_share_rate', message: 'نسبة مشاركة الأرباح مطلوبة' },
  ],
};

function parseDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  const isSameDate = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  return isSameDate ? timestamp : null;
}

function hasNumber(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

function addRequiredDraftErrors(input: OwnerAgreementDraftInput, errors: string[]): void {
  if (!input.owner_id) errors.push('المالك مطلوب');
  if (!input.property_id) errors.push('العقار مطلوب');
  if (!input.starts_on) errors.push('تاريخ البداية مطلوب');
}

function addDateErrors(input: OwnerAgreementDraftInput, errors: string[]): void {
  const startsOn = input.starts_on ? parseDateOnly(input.starts_on) : null;
  const endsOn = input.ends_on ? parseDateOnly(input.ends_on) : null;
  if (input.starts_on && startsOn === null) errors.push('تاريخ البداية غير صالح');
  if (input.ends_on && endsOn === null) errors.push('تاريخ النهاية غير صالح');
  if (startsOn !== null && endsOn !== null && endsOn < startsOn) errors.push('تاريخ النهاية يجب أن يكون بعد البداية');
}

function addPayoutErrors(input: OwnerAgreementDraftInput, errors: string[]): void {
  if (input.payout_day != null && (input.payout_day < 1 || input.payout_day > 31)) errors.push('يوم الصرف يجب أن يكون بين 1 و31');
  if (input.min_payout_amount != null && input.min_payout_amount < 0) errors.push('الحد الأدنى للصرف لا يمكن أن يكون سالباً');
}

function addRangeErrors(input: Partial<OwnerAgreementTerm>, errors: string[]): void {
  for (const field of rateFields) {
    const value = input[field];
    if (typeof value === 'number' && (value < 0 || value > 1)) errors.push(`${field} يجب أن يكون بين 0 و1`);
  }

  for (const field of amountFields) {
    const value = input[field];
    if (typeof value === 'number' && value < 0) errors.push(`${field} لا يمكن أن يكون سالباً`);
  }
}

function addRequiredTermErrors(input: Partial<OwnerAgreementTerm>, agreementType: OwnerAgreementType, errors: string[]): void {
  for (const requirement of requiredTermFieldsByAgreementType[agreementType]) {
    if (!hasNumber(input[requirement.field] as number | null | undefined)) errors.push(requirement.message);
  }
}

export function validateOwnerAgreementDraft(input: OwnerAgreementDraftInput): ValidationResult<OwnerAgreementDraftInput> {
  const errors: string[] = [];
  addRequiredDraftErrors(input, errors);
  addDateErrors(input, errors);
  addPayoutErrors(input, errors);
  return errors.length ? { success: false, errors } : { success: true, data: input };
}

export function validateOwnerAgreementTerms(input: Partial<OwnerAgreementTerm>, agreementType: OwnerAgreementType): ValidationResult<Partial<OwnerAgreementTerm>> {
  const errors: string[] = [];
  addRangeErrors(input, errors);
  addRequiredTermErrors(input, agreementType, errors);
  return errors.length ? { success: false, errors } : { success: true, data: input };
}
