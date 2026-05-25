import { describe, expect, it } from 'vitest';
import { createOwnerAgreement } from './ownerAgreementService';

describe('ownerAgreementService validation', () => {
  it('rejects invalid draft before supabase write', async () => {
    await expect(createOwnerAgreement({ owner_id: '', property_id: '', agreement_type: 'fixed_owner_payout', starts_on: '' } as const)).rejects.toThrow();
  });
});
