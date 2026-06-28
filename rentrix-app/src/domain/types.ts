/**
 * Rentrix Pure Frontend Domain Entities
 * Phase 1 Domain Foundation (Additive and decoupled from Supabase generated types)
 */

export interface Owner {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isArchived: boolean;
  createdAt: string;
}

export type AgreementType = 'property_management' | 'master_lease';

export type AgreementStatus = 'draft' | 'active' | 'terminated' | 'expired';

export interface OwnerAgreement {
  id: string;
  ownerId: string;
  propertyId: string;
  agreementType: AgreementType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: AgreementStatus;
  commissionRate?: number; // Represented as a percentage (e.g., 10 for 10%) or rate, positive
  fixedFee?: number; // Represented as fixed amount, positive
  isArchived: boolean;
  createdAt: string;
}

export interface Property {
  id: string;
  ownerId?: string; // Optional reference to current owner, nullable
  name: string;
  address: string;
  isArchived: boolean;
  createdAt: string;
}

export type UnitStatus = 'vacant' | 'occupied' | 'maintenance';

export interface Unit {
  id: string;
  propertyId: string;
  name: string;
  rentAmount: number; // positive
  status: UnitStatus;
  isArchived: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  isArchived: boolean;
  createdAt: string;
}

export type ContractStatus = 'draft' | 'active' | 'terminated' | 'expired';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export interface LeaseContract {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  agreementId: string; // covering owner agreement reference
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: ContractStatus;
  rentAmount: number; // positive
  paymentFrequency: PaymentFrequency;
  isArchived: boolean;
  createdAt: string;
}

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  contractId: string;
  amount: number; // positive
  dueDate: string; // YYYY-MM-DD
  status: InvoiceStatus;
  isArchived: boolean;
  createdAt: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'check';

export interface PaymentReceipt {
  id: string;
  invoiceId: string;
  amount: number; // positive
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  isArchived: boolean;
  createdAt: string;
}

export type ExpenseResponsibility = 'owner' | 'office' | 'shared';

export interface Expense {
  id: string;
  propertyId: string;
  unitId?: string; // Optional unit level expense
  amount: number; // positive
  expenseDate: string; // YYYY-MM-DD
  description: string;
  responsibility: ExpenseResponsibility;
  isArchived: boolean;
  createdAt: string;
}

export type SettlementStatus = 'draft' | 'approved' | 'paid';

export interface OwnerSettlement {
  id: string;
  ownerId: string;
  agreementId: string;
  settlementDate: string; // YYYY-MM-DD
  grossRevenue: number;
  expensesDeducted: number;
  feesDeducted: number;
  netPayout: number;
  status: SettlementStatus;
  isArchived: boolean;
  createdAt: string;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface AuditEvent {
  id: string;
  userId: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string; // ISO string
  details: string;
}
