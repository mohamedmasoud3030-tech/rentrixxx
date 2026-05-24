import { describe, expect, it } from 'vitest';
import { validateOwnerAgreementDraft, validateOwnerAgreementTerms } from './ownerAgreementValidation';

describe('ownerAgreementValidation', () => {
  it('validates draft dates and payout day', () => {
    const result = validateOwnerAgreementDraft({ owner_id: 'o1', property_id: 'p1', agreement_type: 'fixed_owner_payout', starts_on: '2026-01-10', ends_on: '2026-01-01', payout_day: 40 });
    expect(result.success).toBe(false);
  });

  it('requires fixed payout amount for fixed_owner_payout', () => {
    const result = validateOwnerAgreementTerms({}, 'fixed_owner_payout');
    expect(result.success).toBe(false);
  });

  it('accepts valid percentage ranges', () => {
    const result = validateOwnerAgreementTerms({ office_commission_rate: 0.2, owner_share_rate: 0.8 }, 'percentage_of_gross_collections');
    expect(result.success).toBe(true);
  });
});
