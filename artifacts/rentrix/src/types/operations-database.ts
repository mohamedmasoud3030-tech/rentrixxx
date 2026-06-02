import type { Database, Json } from './database';

type Table<Row, Insert extends Partial<Row> = Partial<Row>, Update extends Partial<Row> = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ExistingTables = Database['public']['Tables'];

type ProspectRow = {
  id: string;
  no: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  desired_unit_type: string | null;
  min_budget: number | null;
  max_budget: number | null;
  updated_at: string | null;
};

type LandRow = {
  id: string;
  plot_no: string | null;
  location: string | null;
  area: number | null;
  owner_id: string | null;
  purchase_price: number | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  name: string | null;
  category: string | null;
  owner_price: number | null;
  commission: number | null;
  updated_at: string | null;
};

type CommissionRow = {
  id: string;
  staff_id: string | null;
  staff_name: string | null;
  amount: number | null;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | null;
  source_id: string | null;
  created_at: string | null;
  type: string | null;
  deal_value: number | null;
  percentage: number | null;
  expense_id: string | null;
  paid_at: number | null;
  updated_at: string | null;
};

type AuditLogRow = {
  id: string;
  ts: number | null;
  user_id: string | null;
  username: string | null;
  action: string | null;
  entity: string | null;
  entity_id: string | null;
  note: string | null;
  updated_at: string | null;
  table: string | null;
  details: string | null;
  created_at: string | null;
};

export type OperationsDatabase = {
  public: {
    Tables: {
      people: ExistingTables['people'];
      properties: ExistingTables['properties'];
      leads: Table<ProspectRow, Partial<ProspectRow> & Pick<ProspectRow, 'id'>>;
      lands: Table<LandRow, Partial<LandRow> & Pick<LandRow, 'id'>>;
      commissions: Table<CommissionRow, Partial<CommissionRow> & Pick<CommissionRow, 'id'>>;
      audit_log: Table<AuditLogRow, Partial<AuditLogRow> & Pick<AuditLogRow, 'id'>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type OperationsJson = Json;
