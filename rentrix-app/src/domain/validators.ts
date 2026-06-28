import { DOMAIN_VALIDATION_AR } from './i18n';
import type { Owner, Property, Unit, Tenant, OwnerAgreement, LeaseContract } from './types';

/**
 * Strict validation for real ISO calendar dates.
 * Rejects malformed patterns, impossible dates (e.g., 2026-02-30), and leap-year violations.
 */
export function isValidISODateString(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  // Format check: exact YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  // Leap year checker
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const daysInMonth = [
    31,
    isLeap ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  return day <= daysInMonth[month - 1];
}

/**
 * Validates that the amount is a positive, finite, real number.
 * Explicitly rejects NaN, Infinity, and -Infinity.
 */
export function validatePositiveAmount(amount: number): { isValid: boolean; message?: string } {
  if (
    typeof amount !== 'number' ||
    isNaN(amount) ||
    !isFinite(amount) ||
    amount <= 0
  ) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.positive_amount_required,
    };
  }
  return { isValid: true };
}

/**
 * Validates a date range where the start date must be before or equal to the end date.
 * Assumes strict YYYY-MM-DD real calendar formats.
 */
export function validateDateRange(startDate: string, endDate: string): { isValid: boolean; message?: string } {
  if (!startDate || !endDate) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.field_required,
    };
  }

  if (!isValidISODateString(startDate) || !isValidISODateString(endDate)) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.date_format_invalid,
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

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
  if (!isValidISODateString(start1) || !isValidISODateString(end1) ||
      !isValidISODateString(start2) || !isValidISODateString(end2)) {
    return false;
  }
  return start1 <= end2 && end1 >= start2;
}

/**
 * Validates that a new owner agreement does not overlap with existing agreements for the same property.
 * Blocks only relevant active/draft lifecycle states; historical expired/terminated agreements do not prevent new ones.
 * Returns explicit date validation errors if any incoming range or date is malformed or reversed.
 */
export function validateAgreementOverlap(
  newAgreement: Pick<OwnerAgreement, 'propertyId' | 'startDate' | 'endDate' | 'id'>,
  existingAgreements: Array<Pick<OwnerAgreement, 'propertyId' | 'startDate' | 'endDate' | 'id' | 'status'>>
): { isValid: boolean; message?: string } {
  // Validate the incoming agreement dates first
  if (newAgreement.endDate) {
    const rangeCheck = validateDateRange(newAgreement.startDate, newAgreement.endDate);
    if (!rangeCheck.isValid) {
      return rangeCheck;
    }
  } else {
    if (!isValidISODateString(newAgreement.startDate)) {
      return {
        isValid: false,
        message: DOMAIN_VALIDATION_AR.date_format_invalid,
      };
    }
  }

  const overlapping = existingAgreements.find((agreement) => {
    // Skip checking self when editing an existing agreement
    if (agreement.id === newAgreement.id) return false;

    // Must be for the same property
    if (agreement.propertyId !== newAgreement.propertyId) return false;

    // Block only active/draft states. Expired/Terminated do not cause overlaps.
    if (agreement.status !== 'active' && agreement.status !== 'draft') return false;

    // Support open-ended existing agreements for overlaps
    const agreementEnd = agreement.endDate || '9999-12-31';
    const newAgreementEnd = newAgreement.endDate || '9999-12-31';

    return areDatesOverlapping(
      newAgreement.startDate,
      newAgreementEnd,
      agreement.startDate,
      agreementEnd
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
 * Returns explicit date validation errors if the incoming contract range or dates are malformed or reversed.
 */
export function validateContractOverlap(
  newContract: Pick<LeaseContract, 'unitId' | 'startDate' | 'endDate' | 'id'>,
  existingContracts: Array<Pick<LeaseContract, 'unitId' | 'startDate' | 'endDate' | 'id' | 'status'>>
): { isValid: boolean; message?: string } {
  // Validate incoming contract dates first
  const rangeCheck = validateDateRange(newContract.startDate, newContract.endDate);
  if (!rangeCheck.isValid) {
    return rangeCheck;
  }

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
 * Includes verification of agreement ID and supports explicit open-ended agreements.
 * Assures strict range checks (start <= end) by reusing validateDateRange, returning explicit errors.
 */
export function validateContractFitsAgreement(
  contract: Pick<LeaseContract, 'startDate' | 'endDate' | 'propertyId' | 'agreementId'>,
  agreement: Pick<OwnerAgreement, 'id' | 'startDate' | 'endDate' | 'propertyId' | 'status' | 'isArchived'>
): { isValid: boolean; message?: string } {
  // 1. Verify and enforce matching agreement IDs
  if (contract.agreementId !== agreement.id) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.agreement_not_found,
    };
  }

  // 2. Verify property matching
  if (contract.propertyId !== agreement.propertyId) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.agreement_not_found,
    };
  }

  // 3. Strict ISO Calendar Date validation and range checking by reusing validateDateRange
  const contractDateCheck = validateDateRange(contract.startDate, contract.endDate);
  if (!contractDateCheck.isValid) {
    return contractDateCheck;
  }

  if (agreement.endDate) {
    const agreementDateCheck = validateDateRange(agreement.startDate, agreement.endDate);
    if (!agreementDateCheck.isValid) {
      return agreementDateCheck;
    }
  } else {
    // Ensure open-ended agreement start date is technically valid
    if (!isValidISODateString(agreement.startDate)) {
      return {
        isValid: false,
        message: DOMAIN_VALIDATION_AR.date_format_invalid,
      };
    }
  }

  // 4. Agreement must be active and not archived
  if (agreement.status !== 'active' || agreement.isArchived) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.agreement_not_active,
    };
  }

  // 5. Check if contract fits agreement's temporal bounds
  const fitsStart = contract.startDate >= agreement.startDate;
  
  // If agreement.endDate is null/undefined, it is open-ended, meaning any end date on/after start date fits.
  const fitsEnd = !agreement.endDate || contract.endDate <= agreement.endDate;

  if (!fitsStart || !fitsEnd) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.contract_out_of_agreement_bounds,
    };
  }

  return { isValid: true };
}

/**
 * Entity-Specific Deactivation/Archival Rule: Owner
 * Fails if the owner has active OR draft agreements.
 */
export function archiveOwner(
  owner: Owner,
  ownerAgreements: Array<Pick<OwnerAgreement, 'ownerId' | 'status' | 'isArchived'>>
): { isValid: boolean; entity?: Owner; message?: string } {
  const hasRelations = ownerAgreements.some(
    (agreement) =>
      agreement.ownerId === owner.id &&
      (agreement.status === 'active' || agreement.status === 'draft') &&
      !agreement.isArchived
  );

  if (hasRelations) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.cannot_archive_owner_with_active_relations,
    };
  }

  return {
    isValid: true,
    entity: {
      ...owner,
      isArchived: true,
    },
  };
}

/**
 * Entity-Specific Deactivation/Archival Rule: Property
 * Fails if the property is linked to active OR draft agreements.
 */
export function archiveProperty(
  property: Property,
  agreements: Array<Pick<OwnerAgreement, 'propertyId' | 'status' | 'isArchived'>>
): { isValid: boolean; entity?: Property; message?: string } {
  const hasRelations = agreements.some(
    (agreement) =>
      agreement.propertyId === property.id &&
      (agreement.status === 'active' || agreement.status === 'draft') &&
      !agreement.isArchived
  );

  if (hasRelations) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.cannot_archive_property_with_active_relations,
    };
  }

  return {
    isValid: true,
    entity: {
      ...property,
      isArchived: true,
    },
  };
}

/**
 * Entity-Specific Deactivation/Archival Rule: Unit
 * Fails if the unit has active OR draft lease contracts.
 */
export function archiveUnit(
  unit: Unit,
  contracts: Array<Pick<LeaseContract, 'unitId' | 'status'>>
): { isValid: boolean; entity?: Unit; message?: string } {
  const hasRelations = contracts.some(
    (contract) =>
      contract.unitId === unit.id &&
      (contract.status === 'active' || contract.status === 'draft')
  );

  if (hasRelations) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.cannot_archive_unit_with_active_relations,
    };
  }

  return {
    isValid: true,
    entity: {
      ...unit,
      isArchived: true,
    },
  };
}

/**
 * Entity-Specific Deactivation/Archival Rule: Tenant
 * Fails if the tenant has active OR draft lease contracts.
 */
export function archiveTenant(
  tenant: Tenant,
  contracts: Array<Pick<LeaseContract, 'tenantId' | 'status'>>
): { isValid: boolean; entity?: Tenant; message?: string } {
  const hasRelations = contracts.some(
    (contract) =>
      contract.tenantId === tenant.id &&
      (contract.status === 'active' || contract.status === 'draft')
  );

  if (hasRelations) {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.cannot_archive_tenant_with_active_relations,
    };
  }

  return {
    isValid: true,
    entity: {
      ...tenant,
      isArchived: true,
    },
  };
}

/**
 * Entity-Specific Deactivation/Archival Rule: OwnerAgreement
 * Fails if the agreement is currently active.
 */
export function archiveAgreement(
  agreement: OwnerAgreement
): { isValid: boolean; entity?: OwnerAgreement; message?: string } {
  if (agreement.status === 'active') {
    return {
      isValid: false,
      message: DOMAIN_VALIDATION_AR.cannot_archive_active_agreement,
    };
  }

  return {
    isValid: true,
    entity: {
      ...agreement,
      isArchived: true,
    },
  };
}

/**
 * Immutability Guard: Rejects archival or deletion of immutable history entities.
 * Contracts, invoices, payments, settlements, and audit events must be preserved read-only.
 */
export function archiveImmutableHistoryRecord(): { isValid: boolean; message: string } {
  return {
    isValid: false,
    message: DOMAIN_VALIDATION_AR.immutable_history_error,
  };
}
