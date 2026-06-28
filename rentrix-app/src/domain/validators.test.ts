import { describe, test, expect } from 'vitest';
import {
  validatePositiveAmount,
  validateDateRange,
  areDatesOverlapping,
  validateAgreementOverlap,
  validateContractOverlap,
  validateContractFitsAgreement,
  archiveEntity,
} from './validators';
import { DOMAIN_VALIDATION_AR } from './i18n';
import type { OwnerAgreement, LeaseContract } from './types';

describe('Phase 1 Domain Foundation Validation Rules (Revised)', () => {
  
  describe('Rule 1: Date Range Validation', () => {
    test('passes when start date is equal to end date', () => {
      const result = validateDateRange('2026-06-28', '2026-06-28');
      expect(result.isValid).toBe(true);
    });

    test('passes when start date is before end date', () => {
      const result = validateDateRange('2026-06-28', '2026-12-31');
      expect(result.isValid).toBe(true);
    });

    test('fails when start date is after end date', () => {
      const result = validateDateRange('2026-12-31', '2026-06-28');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });

    test('fails when dates are missing or invalid', () => {
      const result = validateDateRange('', '2026-06-28');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.field_required);

      const invalidResult = validateDateRange('not-a-date', '2026-06-28');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.message).toBe(DOMAIN_VALIDATION_AR.date_range_invalid);
    });
  });

  describe('Rule 2 & 3: Overlap Logic and Prevention', () => {
    test('areDatesOverlapping detects various overlaps', () => {
      // 1. Fully identical ranges
      expect(areDatesOverlapping('2026-01-01', '2026-12-31', '2026-01-01', '2026-12-31')).toBe(true);

      // 2. Partial overlap (end of one overlaps start of another)
      expect(areDatesOverlapping('2026-01-01', '2026-06-30', '2026-06-01', '2026-12-31')).toBe(true);

      // 3. One range completely inside another
      expect(areDatesOverlapping('2026-01-01', '2026-12-31', '2026-03-01', '2026-04-30')).toBe(true);

      // 4. Consecutive days (no overlap)
      expect(areDatesOverlapping('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31')).toBe(false);

      // 5. Completely separate ranges
      expect(areDatesOverlapping('2026-01-01', '2026-03-01', '2026-06-01', '2026-12-31')).toBe(false);
    });

    test('validateAgreementOverlap prevents overlapping active/draft agreements for same property', () => {
      const existingAgreements: Array<Pick<OwnerAgreement, 'propertyId' | 'startDate' | 'endDate' | 'id' | 'status'>> = [
        {
          id: 'agreement-1',
          propertyId: 'prop-A',
          startDate: '2026-01-01',
          endDate: '2026-06-30',
          status: 'active',
        },
        {
          id: 'agreement-old',
          propertyId: 'prop-A',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          status: 'expired', // Expired agreement should be ignored for overlaps!
        },
      ];

      // Overlapping agreement on same property (against the active one)
      const badAgreement = {
        id: 'agreement-2',
        propertyId: 'prop-A',
        startDate: '2026-06-01',
        endDate: '2026-12-31',
      };
      const badResult = validateAgreementOverlap(badAgreement, existingAgreements);
      expect(badResult.isValid).toBe(false);
      expect(badResult.message).toBe(DOMAIN_VALIDATION_AR.agreement_overlap);

      // Overlapping agreement against the expired one (should pass!)
      const okAgreementOverlappingExpired = {
        id: 'agreement-ok',
        propertyId: 'prop-A',
        startDate: '2025-06-01',
        endDate: '2025-08-30',
      };
      const okResult = validateAgreementOverlap(okAgreementOverlappingExpired, existingAgreements);
      expect(okResult.isValid).toBe(true);
    });

    test('validateContractOverlap prevents overlapping active/draft contracts for same unit', () => {
      const existingContracts: Array<Pick<LeaseContract, 'unitId' | 'startDate' | 'endDate' | 'id' | 'status'>> = [
        {
          id: 'contract-1',
          unitId: 'unit-101',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: 'active',
        },
        {
          id: 'contract-terminated',
          unitId: 'unit-101',
          startDate: '2025-01-01',
          endDate: '2025-06-30',
          status: 'terminated', // Terminated contract should be ignored for overlaps!
        },
        {
          id: 'contract-expired',
          unitId: 'unit-101',
          startDate: '2025-07-01',
          endDate: '2025-12-31',
          status: 'expired', // Expired contract should be ignored for overlaps!
        },
      ];

      // Overlapping contract against the active contract (should fail!)
      const badContract = {
        id: 'contract-2',
        unitId: 'unit-101',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
      };
      const badResult = validateContractOverlap(badContract, existingContracts);
      expect(badResult.isValid).toBe(false);
      expect(badResult.message).toBe(DOMAIN_VALIDATION_AR.contract_overlap);

      // Overlapping contract against terminated or expired contract (should pass!)
      const goodContractOverlappingTerminated = {
        id: 'contract-3',
        unitId: 'unit-101',
        startDate: '2025-03-01',
        endDate: '2025-04-30',
      };
      const goodResult = validateContractOverlap(goodContractOverlappingTerminated, existingContracts);
      expect(goodResult.isValid).toBe(true);
    });
  });

  describe('Rule 4: Contract fits inside active covering owner agreement', () => {
    const agreement: Pick<OwnerAgreement, 'startDate' | 'endDate' | 'propertyId' | 'status' | 'isArchived'> = {
      propertyId: 'prop-A',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
      isArchived: false,
    };

    test('passes when contract dates fit fully inside agreement dates', () => {
      const contract = {
        propertyId: 'prop-A',
        startDate: '2026-02-01',
        endDate: '2026-11-30',
      };
      const result = validateContractFitsAgreement(contract, agreement);
      expect(result.isValid).toBe(true);
    });

    test('passes when contract dates match agreement boundaries exactly', () => {
      const contract = {
        propertyId: 'prop-A',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      };
      const result = validateContractFitsAgreement(contract, agreement);
      expect(result.isValid).toBe(true);
    });

    test('fails when contract starts too early', () => {
      const contract = {
        propertyId: 'prop-A',
        startDate: '2025-12-15',
        endDate: '2026-11-30',
      };
      const result = validateContractFitsAgreement(contract, agreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.contract_out_of_agreement_bounds);
    });

    test('fails when contract ends too late', () => {
      const contract = {
        propertyId: 'prop-A',
        startDate: '2026-02-01',
        endDate: '2027-01-15',
      };
      const result = validateContractFitsAgreement(contract, agreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.contract_out_of_agreement_bounds);
    });

    test('fails when property references do not match', () => {
      const contract = {
        propertyId: 'prop-B', // different property!
        startDate: '2026-02-01',
        endDate: '2026-11-30',
      };
      const result = validateContractFitsAgreement(contract, agreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.agreement_not_found);
    });

    test('fails when agreement is not active or is archived', () => {
      const inactiveAgreement = { ...agreement, status: 'draft' as const };
      const contract = {
        propertyId: 'prop-A',
        startDate: '2026-02-01',
        endDate: '2026-11-30',
      };
      const result = validateContractFitsAgreement(contract, inactiveAgreement);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.agreement_not_active);
    });
  });

  describe('Rule 5: Positive rent and money values', () => {
    test('passes for positive values', () => {
      expect(validatePositiveAmount(1000).isValid).toBe(true);
      expect(validatePositiveAmount(0.01).isValid).toBe(true);
    });

    test('fails for zero or negative values', () => {
      const zeroResult = validatePositiveAmount(0);
      expect(zeroResult.isValid).toBe(false);
      expect(zeroResult.message).toBe(DOMAIN_VALIDATION_AR.positive_amount_required);

      const negResult = validatePositiveAmount(-500);
      expect(negResult.isValid).toBe(false);
      expect(negResult.message).toBe(DOMAIN_VALIDATION_AR.positive_amount_required);
    });
  });

  describe('Rule 9: No cascade-delete (archive/deactivate semantics & immutability checks)', () => {
    test('successfully archives draft/expired/terminated reference entities', () => {
      const inactiveAgreement = {
        id: 'agreement-x',
        isArchived: false,
        status: 'expired',
      };

      const result = archiveEntity(inactiveAgreement, 'agreement');
      expect(result.isValid).toBe(true);
      expect(result.entity?.isArchived).toBe(true);
    });

    test('fails to archive active agreements or active contracts', () => {
      const activeAgreement = {
        id: 'agreement-y',
        isArchived: false,
        status: 'active',
      };

      const result = archiveEntity(activeAgreement, 'agreement');
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(DOMAIN_VALIDATION_AR.cannot_archive_active_agreement);
    });

    test('fails completely to archive immutable operational or financial history entities', () => {
      const draftContract = {
        id: 'contract-x',
        isArchived: false,
        status: 'draft',
      };
      // Even in 'draft' status, contracts are immutable operational history once initialized, as are invoices/payments.
      const contractResult = archiveEntity(draftContract, 'contract');
      expect(contractResult.isValid).toBe(false);
      expect(contractResult.message).toBe(DOMAIN_VALIDATION_AR.immutable_history_error);

      const invoice = {
        id: 'invoice-1',
        isArchived: false,
        status: 'unpaid',
      };
      const invoiceResult = archiveEntity(invoice, 'invoice');
      expect(invoiceResult.isValid).toBe(false);
      expect(invoiceResult.message).toBe(DOMAIN_VALIDATION_AR.immutable_history_error);

      const payment = {
        id: 'receipt-1',
        isArchived: false,
      };
      const paymentResult = archiveEntity(payment, 'payment_receipt');
      expect(paymentResult.isValid).toBe(false);
      expect(paymentResult.message).toBe(DOMAIN_VALIDATION_AR.immutable_history_error);

      const settlement = {
        id: 'settlement-1',
        isArchived: false,
        status: 'draft',
      };
      const settlementResult = archiveEntity(settlement, 'settlement');
      expect(settlementResult.isValid).toBe(false);
      expect(settlementResult.message).toBe(DOMAIN_VALIDATION_AR.immutable_history_error);

      const auditEvent = {
        id: 'audit-1',
        isArchived: false,
      };
      const auditResult = archiveEntity(auditEvent, 'audit_event');
      expect(auditResult.isValid).toBe(false);
      expect(auditResult.message).toBe(DOMAIN_VALIDATION_AR.immutable_history_error);
    });
  });
});
