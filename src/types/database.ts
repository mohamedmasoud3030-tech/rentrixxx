export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | { [key: string]: Json } | Json[];

export interface OwnersRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  management_contract_date: string | null;
  notes: string;
  commission_type: 'RATE' | 'FIXED_MONTHLY';
  commission_value: number;
  is_demo: boolean | null;
  created_at: number;
  updated_at: number | null;
}

export interface PropertiesRow {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  location: string;
  area: number | null;
  year_built: number | null;
  facilities: string | null;
  notes: string;
  is_demo: boolean | null;
  created_at: number;
  updated_at: number | null;
}

export interface UnitsRow {
  id: string;
  property_id: string;
  name: string;
  type: string;
  floor: string | null;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'ON_HOLD';
  rent_default: number;
  min_rent: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  kitchens: number | null;
  living_rooms: number | null;
  water_meter: string | null;
  electricity_meter: string | null;
  features: string | null;
  notes: string;
  is_demo: boolean | null;
  created_at: number;
  updated_at: number | null;
}

export interface TenantsRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  id_no: string;
  tenant_type: 'INDIVIDUAL' | 'COMPANY' | null;
  cr_number: string | null;
  address: string | null;
  postal_code: string | null;
  po_box: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLIST';
  notes: string;
  is_demo: boolean | null;
  created_at: number;
  updated_at: number | null;
}

export interface ContractsRow {
  id: string;
  no: string | null;
  unit_id: string;
  tenant_id: string;
  rent_amount: number;
  due_day: number;
  start_date: string;
  end_date: string;
  deposit: number;
  status: 'ACTIVE' | 'ENDED' | 'SUSPENDED';
  sponsor_name: string | null;
  sponsor_id: string | null;
  sponsor_phone: string | null;
  is_demo: boolean | null;
  deleted_at: string | null;
  created_at: number;
  updated_at: number | null;
}

export interface InvoicesRow {
  id: string;
  no: string;
  contract_id: string;
  due_date: string;
  amount: number;
  tax_amount: number | null;
  paid_amount: number;
  status: 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  type: 'RENT' | 'MAINTENANCE' | 'UTILITY' | 'LATE_FEE';
  notes: string;
  related_invoice_id: string | null;
  payment_method: 'Cash' | 'Bank' | 'Online' | 'Other' | null;
  external_payment_ref: string | null;
  created_at: number;
  updated_at: number | null;
}

export interface ReceiptsRow {
  id: string;
  no: string;
  contract_id: string;
  date_time: string;
  channel: 'CASH' | 'BANK' | 'POS' | 'CHECK' | 'OTHER';
  amount: number;
  ref: string;
  notes: string;
  status: 'POSTED' | 'VOID';
  check_number: string | null;
  check_bank: string | null;
  check_date: string | null;
  check_status: 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | null;
  voided_at: number | null;
  created_at: number;
  updated_at: number | null;
}

export interface ExpensesRow {
  id: string;
  no: string;
  contract_id: string | null;
  owner_id: string | null;
  property_id: string | null;
  payee: string | null;
  date_time: string;
  category: string;
  amount: number;
  tax_amount: number | null;
  ref: string;
  notes: string;
  status: 'POSTED' | 'VOID';
  charged_to: 'OWNER' | 'OFFICE' | 'TENANT' | null;
  voided_at: number | null;
  created_at: number;
  updated_at: number | null;
}

export interface MaintenanceRequestsRow {
  id: string;
  no: string;
  unit_id: string;
  request_date: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | null;
  assigned_to: string | null;
  cost: number;
  charged_to: 'OWNER' | 'OFFICE' | 'TENANT';
  estimated_cost: number | null;
  actual_cost: number | null;
  completion_date: string | null;
  expense_id: string | null;
  invoice_id: string | null;
  created_at: number;
  completed_at: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export interface UsersRow {
  id: string;
  username: string;
  role: 'ADMIN' | 'USER';
  must_change_password: boolean;
  is_disabled: boolean;
  created_at: number;
}

export interface SettingsRow {
  id: number;
  data: Json;
}

export interface AutomationRunsRow {
  id: string;
  ts: number;
  invoices_created: number;
  late_fees_applied: number;
  notifications_created: number;
  snapshots_rebuilt: boolean;
  error: string | null;
}

export interface GovernanceRow {
  id: number;
  read_only: boolean;
  locked_periods: string[] | null;
}

export interface SerialsRow {
  id: number;
  receipt: number;
  expense: number;
  maintenance: number;
  invoice: number;
  lead: number;
  owner_settlement: number;
  journal_entry: number;
  mission: number;
  contract: number;
}

export type SupabaseTableRow =
  | OwnersRow
  | PropertiesRow
  | UnitsRow
  | TenantsRow
  | ContractsRow
  | InvoicesRow
  | ReceiptsRow
  | ExpensesRow
  | MaintenanceRequestsRow
  | UsersRow
  | SettingsRow
  | AutomationRunsRow
  | GovernanceRow
  | SerialsRow;
