import { describe, test, expect } from 'vitest';
import {
  validatePositiveAmount,
  validateDateRange,
  areDatesOverlapping,
  validateAgreementOverlap,
  validateContractOverlap,
  validateContractFitsAgreement,
  isValidISODateString,
  archiveOwner,
  archiveProperty,
  archiveUnit,
  archiveTenant,
  archiveAgreement,
  archiveImmutableHistoryRecord,
} from './validators';
import { DOMAIN_VALIDATION_AR } from './i18n';
import type { Owner, Property, Unit, Tenant, OwnerAgreement, LeaseContract } from './types';

describe('Phase 1 Domain Foundation Validation Rules (Final Corrections V2)', () => {
  
  describe('Rule 1: Real Calendar ISO Date Validation', () => {
    test('isValidISODateString accepts true real calendar dates', () => {
      expect(isValidISODateString('2026-06-28')).toBe(true);
      expect(isValidISODateString('2024-02-29')).toBe(true); // 2024 is leap year
      expect(isValidISODateString('2025-12-31')).toBe(true);
    });

    test('isValidISODateString rejects malformed date patterns', () => {
      expect(isValidISODateString('')).toBe(false);
      expect(isValidISODateString(null)).toBe(false);
      expect(isValidISODateString(undefined)).toBe(false);
      expect(isValidISODateString('not-a-date')).toBe(false);
      expect(isValidISODateString('2026/06/28')).toBe(false);
      expect(isValidISODateString('26-06-28')).toBe(false);
      expect(isValidISODateString('2026-6-28')).toBe(false);
    });

    test('isValidISODateString rejects impossible dates on real calendar', () => {
      expect(isValidISODateString('2026-02-30')).toBe(false); // Feb has max 28 days in 2026
      expect(isValidISODateString('2025-02-29')).toBe(false); // 2025 is not a leap year
      expect(isValidISODateString('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidISODateString('2026-13-01')).toBe(false); // Month 13 is invalid
      expect(isValidISODateString('2026-00-10')).toBe(false); // Month 00 is invalid
      expect(isValidISODateString('2026-05-00')).toBe(false); // Day 00 is invalid
    });

    test('validateDateRange fails on invalid real dates', () => {
      const result = validateDateRange('2026-02-30', '2026-06-28');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.date_format_invalid);
    });

    test('validateDateRange fails when start date is after end date', () => {
      const result = validateDateRange('2026-12-31', '2026-06-28');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });
  });

  describe('Rule 2 & 3: Overlap Logic and Prevention (Active/Draft Only)', () => {
    test('validateAgreementOverlap ignores expired and terminated agreements', () => {
      const existingAgreements = [
        {
          id: 'agreement-active',
          propertyId: 'prop-A',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active' as const,
        },
        {
          id: 'agreement-expired',
          propertyId: 'prop-A',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          status: 'expired' as const,
        },
      ];

      // Tries to overlap with active agreement (should fail)
      const bad = {
        id: 'new-agreement',
        propertyId: 'prop-A',
        startDate: '2026-06-01',
        endDate: '2026-08-30',
      };
      const badRes = validateAgreementOverlap(bad, existingAgreements);
      expect(badRes.isValid).toBe(false);
      expect(badRes.message).toBe(DOMAIN_VALIDATION_AR.agreement_overlap);

      // Tries to overlap only with expired agreements (should pass!)
      const ok = {
        id: 'new-agreement-ok',
        propertyId: 'prop-A',
        startDate: '2025-06-01',
        endDate: '2025-08-30',
      };
      const okRes = validateAgreementOverlap(ok, existingAgreements);
      expect(okRes.isValid).toBe(true);
    });

    test('validateAgreementOverlap returns explicit error when new agreement date range is reversed/invalid', () => {
      const existingAgreements = [
        {
          id: 'agreement-active',
          propertyId: 'prop-A',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active' as const,
        },
      ];

      // New agreement has reversed range
      const reversed = {
        id: 'new-agreement-rev',
        propertyId: 'prop-A',
        startDate: '2026-12-31',
        endDate: '2026-01-01', // start > end
      };
      const res = validateAgreementOverlap(reversed, existingAgreements);
      expect(res.isValid).toBe(false);
      expect(res.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });

    test('validateContractOverlap ignores expired and terminated lease contracts', () => {
      const existingContracts = [
        {
          id: 'contract-active',
          unitId: 'unit-101',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active' as const,
        },
        {
          id: 'contract-expired',
          unitId: 'unit-101',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          status: 'expired' as const,
        },
      ];

      // Overlaps with active contract (should fail)
      const bad = {
        id: 'new-contract',
        unitId: 'unit-101',
        startDate: '2026-05-01',
        endDate: '2026-08-30',
      };
      const badRes = validateContractOverlap(bad, existingContracts);
      expect(badRes.isValid).toBe(false);
      expect(badRes.message).toBe(DOMAIN_VALIDATION_AR.contract_overlap);

      // Overlaps only with expired (should pass)
      const ok = {
        id: 'new-contract-ok',
        unitId: 'unit-101',
        startDate: '2025-06-01',
        endDate: '2025-08-30',
      };
      const okRes = validateContractOverlap(ok, existingContracts);
      expect(okRes.isValid).toBe(true);
    });

    test('validateContractOverlap returns explicit error when new contract date range is reversed/invalid', () => {
      const existingContracts = [
        {
          id: 'contract-active',
          unitId: 'unit-101',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active' as const,
        },
      ];

      // New contract has reversed range
      const reversed = {
        id: 'new-contract-rev',
        unitId: 'unit-101',
        startDate: '2026-12-31',
        endDate: '2026-01-01', // start > end
      };
      const res = validateContractOverlap(reversed, existingContracts);
      expect(res.isValid).toBe(false);
      expect(res.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });
  });

  describe('Rule 4: Contract fits inside active covering owner agreement', () => {
    const agreement = {
      id: 'agreement-100',
      propertyId: 'prop-A',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active' as const,
      isArchived: false,
    };

    test('passes when contract fits perfectly and agreementId matches', () => {
      const contract = {
        agreementId: 'agreement-100',
        propertyId: 'prop-A',
        startDate: '2026-03-01',
        endDate: '2026-09-30',
      };
      expect(validateContractFitsAgreement(contract, agreement).isValid).toBe(true);
    });

    test('fails when contract start > end (reversed range)', () => {
      const contractReversed = {
        agreementId: 'agreement-100',
        propertyId: 'prop-A',
        startDate: '2026-12-31',
        endDate: '2026-01-01', // reversed!
      };
      const result = validateContractFitsAgreement(contractReversed, agreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });

    test('fails when agreement start > end (reversed range)', () => {
      const badAgreement = {
        id: 'agreement-100',
        propertyId: 'prop-A',
        startDate: '2026-12-31',
        endDate: '2026-01-01', // reversed!
        status: 'active' as const,
        isArchived: false,
      };
      const contract = {
        agreementId: 'agreement-100',
        propertyId: 'prop-A',
        startDate: '2026-03-01',
        endDate: '2026-09-30',
      };
      const result = validateContractFitsAgreement(contract, badAgreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });

    test('fails when agreementId does not match agreement.id', () => {
      const contract = {
        agreementId: 'agreement-DIFFERENT',
        propertyId: 'prop-A',
        startDate: '2026-03-01',
        endDate: '2026-09-30',
      };
      const result = validateContractFitsAgreement(contract, agreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.agreement_not_found);
    });

    test('supports explicit open-ended agreement', () => {
      const openEndedAgreement = {
        id: 'agreement-open',
        propertyId: 'prop-A',
        startDate: '2026-01-01',
        endDate: null,
        status: 'active' as const,
        isArchived: false,
      };

      const contractGood = {
        agreementId: 'agreement-open',
        propertyId: 'prop-A',
        startDate: '2026-06-01',
        endDate: '2030-12-31',
      };
      expect(validateContractFitsAgreement(contractGood, openEndedAgreement).isValid).toBe(true);
    });
  });

  describe('Rule 5: Finite Positive Money Validation', () => {
    test('passes for standard positive finite amounts', () => {
      expect(validatePositiveAmount(1500).isValid).toBe(true);
    });

    test('rejects zero, negative, NaN and Infinities', () => {
      expect(validatePositiveAmount(0).isValid).toBe(false);
      expect(validatePositiveAmount(-50).isValid).toBe(false);
      expect(validatePositiveAmount(NaN).isValid).toBe(false);
      expect(validatePositiveAmount(Infinity).isValid).toBe(false);
    });
  });

  describe('Rule 9: Entity-Specific Archive/Deactivate & Immutability Rules', () => {
    const owner: Owner = {
      id: 'owner-1',
      name: 'أحمد',
      phone: '0500000000',
      isArchived: false,
      createdAt: '2026-06-28',
    };

    const property: Property = {
      id: 'prop-1',
      ownerId: 'owner-1',
      name: 'برج الياسمين',
      address: 'الرياض',
      isArchived: false,
      createdAt: '2026-06-28',
    };

    const unit: Unit = {
      id: 'unit-1',
      propertyId: 'prop-1',
      name: 'شقة 1',
      rentAmount: 12000,
      status: 'vacant',
      isArchived: false,
      createdAt: '2026-06-28',
    };

    const tenant: Tenant = {
      id: 'tenant-1',
      name: 'خالد',
      phone: '0511111111',
      isArchived: false,
      createdAt: '2026-06-28',
    };

    test('archives owner if no active/draft agreements are linked', () => {
      const agreements = [
        {
          ownerId: 'owner-1',
          status: 'expired' as const,
          isArchived: false,
        },
      ];
      const result = archiveOwner(owner, agreements);
      expect(result.isValid).toBe(true);
    });

    test('fails to archive owner if active OR draft agreement is linked', () => {
      const activeAgreements = [
        {
          ownerId: 'owner-1',
          status: 'active' as const,
          isArchived: false,
        },
      ];
      expect(archiveOwner(owner, activeAgreements).isValid).toBe(false);

      const draftAgreements = [
        {
          ownerId: 'owner-1',
          status: 'draft' as const,
          isArchived: false,
        },
      ];
      expect(archiveOwner(owner, draftAgreements).isValid).toBe(false);
    });

    test('fails to archive property if active OR draft agreement is linked', () => {
      const activeAgreements = [
        {
          propertyId: 'prop-1',
          status: 'active' as const,
          isArchived: false,
        },
      ];
      expect(archiveProperty(property, activeAgreements).isValid).toBe(false);
    });

    test('fails to archive unit if active OR draft contract is linked', () => {
      const activeContracts = [
        {
          unitId: 'unit-1',
          status: 'active' as const,
        },
      ];
      expect(archiveUnit(unit, activeContracts).isValid).toBe(false);
    });

    test('fails to archive tenant if active OR draft contract is linked', () => {
      const activeContracts = [
        {
          tenantId: 'tenant-1',
          status: 'active' as const,
        },
      ];
      expect(archiveTenant(tenant, activeContracts).isValid).toBe(false);
    });

    test('fails completely to archive immutable history records', () => {
      expect(archiveImmutableHistoryRecord().isValid).toBe(false);
    });
  });
});
