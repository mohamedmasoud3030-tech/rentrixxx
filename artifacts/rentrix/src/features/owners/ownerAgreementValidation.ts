import type { OwnerAgreementTerm, OwnerAgreementType } from './ownerAgreementTypes';

type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

export type OwnerAgreementDraftInput = { owner_id: string; property_id: string; agreement_type: OwnerAgreementType; starts_on: string; ends_on?: string | null; payout_day?: number | null; min_payout_amount?: number | null; };

function parseDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return timestamp;
}

function hasNumber(value: number | null | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateOwnerAgreementDraft(input: OwnerAgreementDraftInput): ValidationResult<OwnerAgreementDraftInput> {
  const errors: string[] = [];
  if (!input.owner_id) errors.push('المالك مطلوب');
  if (!input.property_id) errors.push('العقار مطلوب');
  if (!input.starts_on) errors.push('تاريخ البداية مطلوب');
  const startsOn = input.starts_on ? parseDateOnly(input.starts_on) : null;
  const endsOn = input.ends_on ? parseDateOnly(input.ends_on) : null;
  if (input.starts_on && startsOn === null) errors.push('تاريخ البداية غير صالح');
  if (input.ends_on && endsOn === null) errors.push('تاريخ النهاية غير صالح');
  if (startsOn !== null && endsOn !== null && endsOn < startsOn) errors.push('تاريخ النهاية يجب أن يكون بعد البداية');
  if (input.payout_day != null && (input.payout_day < 1 || input.payout_day > 31)) errors.push('يوم الصرف يجب أن يكون بين 1 و31');
  if (input.min_payout_amount != null && input.min_payout_amount < 0) errors.push('الحد الأدنى للصرف لا يمكن أن يكون سالباً');
  return errors.length ? { success: false, errors } : { success: true, data: input };
}

export function validateOwnerAgreementTerms(input: Partial<OwnerAgreementTerm>, agreementType: OwnerAgreementType): ValidationResult<Partial<OwnerAgreementTerm>> {
  const errors: string[] = [];
  const rateFields: Array<keyof OwnerAgreementTerm> = ['office_commission_rate', 'owner_share_rate', 'profit_share_rate'];
  const amountFields: Array<keyof OwnerAgreementTerm> = ['fixed_owner_payout_amount', 'fixed_management_fee_amount', 'guaranteed_minimum_amount', 'upside_threshold_amount'];
  for (const field of rateFields) { const v = input[field]; if (typeof v === 'number' && (v < 0 || v > 1)) errors.push(`${field} يجب أن يكون بين 0 و1`); }
  for (const field of amountFields) { const v = input[field]; if (typeof v === 'number' && v < 0) errors.push(`${field} لا يمكن أن يكون سالباً`); }

  if (agreementType === 'percentage_of_gross_collections' && !hasNumber(input.owner_share_rate)) errors.push('نسبة حصة المالك مطلوبة');
  if (agreementType === 'percentage_of_net_collections' && !hasNumber(input.owner_share_rate)) errors.push('نسبة حصة المالك مطلوبة');
  if (agreementType === 'fixed_owner_payout' && !hasNumber(input.fixed_owner_payout_amount)) errors.push('قيمة الصرف الثابت مطلوبة');
  if (agreementType === 'fixed_management_fee' && !hasNumber(input.fixed_management_fee_amount)) errors.push('قيمة عمولة الإدارة الثابتة مطلوبة');
  if (agreementType === 'guaranteed_minimum_plus_percentage') {
    if (!hasNumber(input.guaranteed_minimum_amount)) errors.push('الحد الأدنى المضمون مطلوب');
    if (!hasNumber(input.owner_share_rate)) errors.push('نسبة حصة المالك مطلوبة');
  }
  if (agreementType === 'fixed_plus_profit_share') {
    if (!hasNumber(input.fixed_owner_payout_amount)) errors.push('قيمة الصرف الثابت مطلوبة');
    if (!hasNumber(input.profit_share_rate)) errors.push('نسبة مشاركة الأرباح مطلوبة');
  }

  return errors.length ? { success: false, errors } : { success: true, data: input };
}
