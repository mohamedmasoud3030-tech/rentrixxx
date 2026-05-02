export type InvoiceStatus = 'all' | 'unpaid' | 'overdue' | 'paid';
export type InvoiceType = 'all' | 'RENT' | 'LATE_FEE' | 'UTILITY' | 'OTHER';

export interface InvoiceFiltersState {
  status: InvoiceStatus;
  type: InvoiceType;
  dateFrom: string;
  dateTo: string;
  search: string;
}

export interface InvoiceWithDetails {
  id: string;
  no: string;
  contractId: string;
  dueDate: string;
  amount: number;
  taxAmount?: number;
  paidAmount?: number;
  status: string;
  type: string;
  notes?: string;
  tenant?: { name: string; phone?: string; id: string };
  unit?: { name: string; id: string };
  propertyName?: string;
  total: number;
  remaining: number;
  effectiveStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID' | 'OVERDUE';
}

export interface InvoiceStats {
  unpaid: number;
  overdue: number;
  collectedThisMonth: number;
}
