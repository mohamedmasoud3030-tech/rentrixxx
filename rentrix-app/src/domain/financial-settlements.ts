import type { Expense, Invoice, LeaseContract, OwnerAgreement, PaymentReceipt } from './types';

export interface OwnerSettlementSummary {
  ownerId: string;
  agreementId: string;
  propertyId: string;
  grossRevenue: number;
  feesDeducted: number;
  expensesDeducted: number;
  netPayout: number;
}

export interface OfficeProfitabilitySummary {
  totalManagementFees: number;
  totalMasterLeaseMargins: number;
  totalOperationalExpenses: number;
  netRevenue: number;
}

export function getReceiptPropertyId(
  receipt: PaymentReceipt,
  invoices: readonly Invoice[],
  contracts: readonly LeaseContract[]
): string | null {
  const inv = invoices.find((i) => i.id === receipt.invoiceId);
  if (!inv) return null;
  const contract = contracts.find((c) => c.id === inv.contractId);
  return contract ? contract.propertyId : null;
}

export function calculateOwnerSettlement(
  agreement: OwnerAgreement,
  propertyReceipts: readonly PaymentReceipt[],
  propertyExpenses: readonly Expense[]
): OwnerSettlementSummary {
  const ownerExpenses = propertyExpenses
    .filter((e) => !e.isArchived && (e.responsibility === 'owner' || e.responsibility === 'shared'))
    .reduce((sum, e) => sum + e.amount, 0);

  if (agreement.agreementType === 'master_lease') {
    const fixedFee = agreement.fixedFee ?? 0;
    return {
      ownerId: agreement.ownerId,
      agreementId: agreement.id,
      propertyId: agreement.propertyId,
      grossRevenue: fixedFee,
      feesDeducted: 0,
      expensesDeducted: ownerExpenses,
      netPayout: fixedFee - ownerExpenses,
    };
  }

  const grossRevenue = propertyReceipts.reduce((sum, r) => sum + r.amount, 0);
  const commRate = agreement.commissionRate ?? 0;
  const fixedFee = agreement.fixedFee ?? 0;
  const feesDeducted = grossRevenue * (commRate / 100) + fixedFee;
  const netPayout = grossRevenue - feesDeducted - ownerExpenses;

  return {
    ownerId: agreement.ownerId,
    agreementId: agreement.id,
    propertyId: agreement.propertyId,
    grossRevenue,
    feesDeducted,
    expensesDeducted: ownerExpenses,
    netPayout,
  };
}

export function calculateOfficeProfitability(
  agreements: readonly OwnerAgreement[],
  allReceipts: readonly PaymentReceipt[],
  invoices: readonly Invoice[],
  contracts: readonly LeaseContract[],
  allExpenses: readonly Expense[]
): OfficeProfitabilitySummary {
  let totalManagementFees = 0;
  let totalMasterLeaseMargins = 0;

  for (const agreement of agreements) {
    if (agreement.isArchived) continue;
    const propReceipts = allReceipts.filter((r) => getReceiptPropertyId(r, invoices, contracts) === agreement.propertyId);
    const grossRevenue = propReceipts.reduce((sum, r) => sum + r.amount, 0);

    if (agreement.agreementType === 'property_management') {
      const commRate = agreement.commissionRate ?? 0;
      const fixedFee = agreement.fixedFee ?? 0;
      totalManagementFees += grossRevenue * (commRate / 100) + fixedFee;
    } else if (agreement.agreementType === 'master_lease') {
      const fixedObligation = agreement.fixedFee ?? 0;
      totalMasterLeaseMargins += grossRevenue - fixedObligation;
    }
  }

  const officeExpenses = allExpenses
    .filter((e) => !e.isArchived && (e.responsibility === 'office' || e.responsibility === 'shared'))
    .reduce((sum, e) => sum + e.amount, 0);

  const netRevenue = totalManagementFees + totalMasterLeaseMargins - officeExpenses;

  return {
    totalManagementFees,
    totalMasterLeaseMargins,
    totalOperationalExpenses: officeExpenses,
    netRevenue,
  };
}
