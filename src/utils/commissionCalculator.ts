// src/utils/commissionCalculator.ts
// Fixed commission calculation utility

import type { Owner, Contract } from '../types';

export interface CommissionCalculation {
  monthlyCommission: number;
  totalCommission: number;
  commissionType: 'RATE' | 'FIXED_MONTHLY';
  commissionValue: number;
  rentAmount: number;
  contractMonths: number;
}

/**
 * Calculate management commission for a contract
 * Fixes the bug where FIXED_MONTHLY always returns 0
 */
export function calculateCommission(
  owner: Owner,
  contract: Contract
): CommissionCalculation {
  const rentAmount = contract.rent || 0;
  const commissionType = owner.commissionType;
  const commissionValue = owner.commissionValue || 0;

  // Calculate contract duration in months
  const startDate = new Date(contract.start);
  const endDate = new Date(contract.end);
  const contractMonths = Math.max(
    1,
    Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    )
  );

  let monthlyCommission: number;

  // CRITICAL FIX: Handle FIXED_MONTHLY correctly
  if (commissionType === 'FIXED_MONTHLY') {
    // For fixed monthly, the commission IS the fixed amount per month
    monthlyCommission = commissionValue;
  } else if (commissionType === 'RATE') {
    // For percentage rate, calculate based on rent
    monthlyCommission = (rentAmount * commissionValue) / 100;
  } else {
    // Fallback for unknown types
    monthlyCommission = 0;
  }

  // Round to 3 decimal places (OMR precision)
  monthlyCommission = Math.round(monthlyCommission * 1000) / 1000;
  const totalCommission = Math.round(monthlyCommission * contractMonths * 1000) / 1000;

  return {
    monthlyCommission,
    totalCommission,
    commissionType,
    commissionValue,
    rentAmount,
    contractMonths,
  };
}

/**
 * Get formatted commission display text
 */
export function getCommissionDisplayText(
  owner: Owner,
  contract: Contract
): string {
  const calc = calculateCommission(owner, contract);
  
  if (calc.commissionType === 'FIXED_MONTHLY') {
    return `${calc.monthlyCommission.toFixed(3)} ر.ع شهرياً (ثابت)`;
  } else {
    return `${calc.commissionValue}% من الإيجار (${calc.monthlyCommission.toFixed(3)} ر.ع شهرياً)`;
  }
}

/**
 * Validate commission settings
 */
export function validateCommissionSettings(
  commissionType: string,
  commissionValue: number
): { valid: boolean; error?: string } {
  if (commissionType !== 'RATE' && commissionType !== 'FIXED_MONTHLY') {
    return {
      valid: false,
      error: 'نوع العمولة غير صحيح. يجب أن يكون RATE أو FIXED_MONTHLY',
    };
  }

  if (commissionValue < 0) {
    return {
      valid: false,
      error: 'قيمة العمولة لا يمكن أن تكون سالبة',
    };
  }

  if (commissionType === 'RATE' && commissionValue > 100) {
    return {
      valid: false,
      error: 'نسبة العمولة لا يمكن أن تتجاوز 100%',
    };
  }

  return { valid: true };
}

/**
 * Calculate total commissions for all active contracts of an owner
 */
export function calculateOwnerTotalCommissions(
  owner: Owner,
  contracts: Contract[]
): {
  monthlyTotal: number;
  annualTotal: number;
  contractCount: number;
} {
  const activeContracts = contracts.filter(
    (c) => c.status === 'ACTIVE' && !c.deletedAt
  );

  let monthlyTotal = 0;
  let annualTotal = 0;

  activeContracts.forEach((contract) => {
    const calc = calculateCommission(owner, contract);
    monthlyTotal += calc.monthlyCommission;
    annualTotal += calc.totalCommission;
  });

  return {
    monthlyTotal: Math.round(monthlyTotal * 1000) / 1000,
    annualTotal: Math.round(annualTotal * 1000) / 1000,
    contractCount: activeContracts.length,
  };
}

/**
 * Generate commission breakdown for reporting
 */
export function generateCommissionBreakdown(
  owners: Owner[],
  contracts: Contract[]
): Array<{
  ownerId: string;
  ownerName: string;
  commissionType: string;
  commissionValue: number;
  activeContracts: number;
  monthlyCommission: number;
  annualCommission: number;
}> {
  return owners.map((owner) => {
    const ownerContracts = contracts.filter(
      (c) => {
        // Find property and check if it belongs to this owner
        // This requires property data - implement based on your data structure
        return c.status === 'ACTIVE' && !c.deletedAt;
      }
    );

    const totals = calculateOwnerTotalCommissions(owner, ownerContracts);

    return {
      ownerId: owner.id,
      ownerName: owner.name,
      commissionType: owner.commissionType,
      commissionValue: owner.commissionValue,
      activeContracts: totals.contractCount,
      monthlyCommission: totals.monthlyTotal,
      annualCommission: totals.annualTotal,
    };
  });
}
