import type { OwnerAgreementTerm, OwnerAgreementType } from './ownerAgreementTypes';

type ValidationResult<T> = { success: true; data: T } | { success: false; errors: string[] };

export type OwnerAgreementDraftInput = { owner_id: string; property_id: string; agreement_type: OwnerAgreementType; starts_on: string; ends_on?: string | null; payout_day?: number | null; min_payout_amount?: number | null; };

export function validateOwnerAgreementDraft(input: OwnerAgreementDraftInput): ValidationResult<OwnerAgreementDraftInput> {
  const errors: string[] = [];
  if (!input.owner_id) errors.push('المالك مطلوب');
  if (!input.property_id) errors.push('العقار مطلوب');
  if (!input.starts_on) errors.push('تاريخ البداية مطلوب');
  if (input.ends_on && input.ends_on < input.starts_on) errors.push('تاريخ النهاية يجب أن يكون بعد البداية');
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
  if (agreementType === 'fixed_owner_payout' && input.fixed_owner_payout_amount == null) errors.push('قيمة الصرف الثابت مطلوبة');
  if (agreementType === 'fixed_management_fee' && input.fixed_management_fee_amount == null) errors.push('قيمة عمولة الإدارة الثابتة مطلوبة');
  return errors.length ? { success: false, errors } : { success: true, data: input };
}
