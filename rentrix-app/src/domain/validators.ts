import { DOMAIN_VALIDATION_AR } from './i18n';
import type { OwnerAgreement, LeaseContract } from './types';

export type EntityType =
  | 'owner'
  | 'agreement'
  | 'property'
  | 'unit'
  | 'tenant'
  | 'contract'
  | 'invoice'
  | 'payment_receipt'
  | 'expense'
  | 'settlement'
  | 'audit_event';

/**
 * Validates that the amount is greater than zero.
 * Used for rent, invoices, receipts, and expenses.
 */
export function validatePositiveAmount(amount: number): { isValid: boolean; message?: string } {
  if (amount <= 0) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.positive_amount_required,
    };
  }
  return { isValid: true };
}

/**
 * Validates a date range where the start date must be before or equal to the end date.
 * Assumes YYYY-MM-DD string format.
 */
export function validateDateRange(startDate: string, endDate: string): { isValid: boolean; message?: string } {
  if (!startDate || !endDate) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.field_required,
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.date_range_invalid,
    };
  }

  if (start > end) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.date_range_invalid,
    };
  }

  return { isValid: true };
}

/**
 * Checks if two date ranges overlap.
 * Ranges are inclusive.
 */
export function areDatesOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Direct alphabetical string comparisons work perfectly for ISO YYYY-MM-DD formats
  return start1 <= end2 && end1 >= start2;
}

/**
 * Validates that a new owner agreement does not overlap with existing agreements for the same property.
 * Blocks only relevant active/draft lifecycle states; historical expired/terminated agreements do not prevent new ones.
 */
export function validateAgreementOverlap(
  newAgreement: Pick<OwnerAgreement, 'propertyId' | 'startDate' | 'endDate' | 'id'>,
  existingAgreements: Array<Pick<OwnerAgreement, 'propertyId' | 'startDate' | 'endDate' | 'id' | 'status'>>
): { isValid: boolean; message?: string } {
  const overlapping = existingAgreements.find((agreement) => {
    // Skip checking self when editing an existing agreement
    if (agreement.id === newAgreement.id) return false;

    // Must be for the same property
    if (agreement.propertyId !== newAgreement.propertyId) return false;

    // Block only active/draft states. Expired/Terminated do not cause overlaps.
    if (agreement.status !== 'active' && agreement.status !== 'draft') return false;

    return areDatesOverlapping(
      newAgreement.startDate,
      newAgreement.endDate,
      agreement.startDate,
      agreement.endDate
    );
  });

  if (overlapping) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.agreement_overlap,
    };
  }

  return { isValid: true };
}

/**
 * Validates that a new lease contract does not overlap with existing contracts for the same unit.
 * Blocks only relevant active/draft lifecycle states; historical expired/terminated contracts do not prevent new ones.
 */
export function validateContractOverlap(
  newContract: Pick<LeaseContract, 'unitId' | 'startDate' | 'endDate' | 'id'>,
  existingContracts: Array<Pick<LeaseContract, 'unitId' | 'startDate' | 'endDate' | 'id' | 'status'>>
): { isValid: boolean; message?: string } {
  const overlapping = existingContracts.find((contract) => {
    // Skip self
    if (contract.id === newContract.id) return false;

    // Must be for the same unit
    if (contract.unitId !== newContract.unitId) return false;

    // Block only active/draft states. Expired/Terminated do not cause overlaps.
    if (contract.status !== 'active' && contract.status !== 'draft') return false;

    return areDatesOverlapping(
      newContract.startDate,
      newContract.endDate,
      contract.startDate,
      contract.endDate
    );
  });

  if (overlapping) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.contract_overlap,
    };
  }

  return { isValid: true };
}

/**
 * Validates that a lease contract fits entirely inside an active covering owner agreement's dates.
 */
export function validateContractFitsAgreement(
  contract: Pick<LeaseContract, 'startDate' | 'endDate' | 'propertyId'>,
  agreement: Pick<OwnerAgreement, 'startDate' | 'endDate' | 'propertyId' | 'status' | 'isArchived'>
): { isValid: boolean; message?: string } {
  // 1. Must be the same property
  if (contract.propertyId !== agreement.propertyId) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.agreement_not_found,
    };
  }

  // 2. Agreement must be active and not archived
  if (agreement.status !== 'active' || agreement.isArchived) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.agreement_not_active,
    };
  }

  // 3. Contract start and end dates must fit fully within agreement start and end dates
  const fitsStart = contract.startDate >= agreement.startDate;
  const fitsEnd = contract.endDate <= agreement.endDate;

  if (!fitsStart || !fitsEnd) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.contract_out_of_agreement_bounds,
    };
  }

  return { isValid: true };
}

/**
 * Implements archive/deactivate semantics instead of destructive removal.
 * Validates mutable/reference types and rejects sensitive financial/operational history records (contracts, invoices, receipts, settlements, audit events).
 */
export function archiveEntity<T extends { isArchived: boolean; status?: string }>(
  entity: T,
  entityType: EntityType
): { isValid: boolean; entity?: T; message?: string } {
  // Rule 1: Immutable operational/financial history must be preserved as read-only.
  const immutableTypes: EntityType[] = [
    'contract',
    'invoice',
    'payment_receipt',
    'settlement',
    'audit_event',
  ];

  if (immutableTypes.includes(entityType)) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.immutable_history_error,
    };
  }

  // Rule 2: Active reference entities cannot be archived.
  if (entity.status === 'active') {
    if (entityType === 'agreement') {
      return {
        isValid: false,
        message: DOMAIN_VALIDATION_AR.cannot_archive_active_agreement,
      };
    } else {
      return {
        isValid: false,
        message: DOMAIN_VALIDATION_AR.cannot_archive_active_contract,
      };
    }
  }

  return {
    isValid: true,
    entity: {
      ...entity,
      isArchived: true,
    },
  };
}
