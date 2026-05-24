export type OwnerAgreementType =
  | 'percentage_of_gross_collections'
  | 'percentage_of_net_collections'
  | 'fixed_owner_payout'
  | 'fixed_management_fee'
  | 'guaranteed_minimum_plus_percentage'
  | 'fixed_plus_profit_share';

export type OwnerAgreementStatus = 'draft' | 'active' | 'superseded' | 'terminated';
export type OwnerAgreementCalculationBasis = 'cash_collected' | 'accrual_billed';
export type OwnerAgreementPayoutCycle = 'monthly' | 'quarterly' | 'custom';

export interface OwnerManagementAgreement {
  id: string; property_id: string; owner_id: string; property_owner_id: string | null;
  agreement_type: OwnerAgreementType; status: OwnerAgreementStatus; starts_on: string; ends_on: string | null;
  currency: string; calculation_basis: OwnerAgreementCalculationBasis; payout_cycle: OwnerAgreementPayoutCycle;
  payout_day: number | null; min_payout_amount: number | null; carry_forward_deficit: boolean; tax_inclusive: boolean;
  deposit_treatment: 'exclude' | 'include' | 'escrow'; rounding_mode: string; notes: string | null;
  created_at: string; updated_at: string;
}
export interface OwnerAgreementTerm { agreement_id: string; office_commission_rate: number | null; owner_share_rate: number | null; fixed_owner_payout_amount: number | null; fixed_management_fee_amount: number | null; guaranteed_minimum_amount: number | null; profit_share_rate: number | null; upside_threshold_amount: number | null; apply_commission_before_expenses: boolean | null; }
export interface OwnerAgreementExpenseRule { agreement_id: string; expense_category: string; treatment: 'deductible' | 'non_deductible' | 'cap_only'; cap_amount: number | null; }
export interface OwnerAgreementTaxRule { agreement_id: string; rule_type: 'commission_tax' | 'withholding_tax' | 'owner_tax'; rate: number; applies_to: string; is_inclusive: boolean; }

/** Future-phase contracts only: no runtime calculations in Phase 1. */
export interface OwnerEntitlementPreviewContract { agreement_id: string; period_start: string; period_end: string; }
export interface OfficeCommissionPreviewContract { agreement_id: string; period_start: string; period_end: string; }
export interface OwnerStatementDraftContract { agreement_id: string; period_start: string; period_end: string; }
export interface AccountingPostingDraftContract { agreement_id: string; statement_id?: string; posting_date: string; }
