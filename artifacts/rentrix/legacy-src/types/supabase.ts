export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ProfileRow = {
  id: string;
  username: string | null;
  role: 'ADMIN' | 'USER' | null;
  must_change_password: boolean | null;
  is_disabled: boolean | null;
  created_at: string | null;
};

type GenericTable = {
  Row: any;
  Insert: any;
  Update: any;
  Relationships: never[];
};

export type BalanceReconciliationRow = {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  ledger_value: number;
  cached_value: number;
  drift: number;
  reconciliation_status: 'OK' | 'WARN' | 'CRITICAL';
  checked_at: string;
};

type GenericView = {
  Row: Record<string, unknown>;
  Relationships: never[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id'>;
        Update: Partial<ProfileRow>;
        Relationships: never[];
      };
      [key: string]: GenericTable;
    };
    Views: {
      v_balance_reconciliation: {
        Row: BalanceReconciliationRow;
        Relationships: never[];
      };
      v_balance_reconciliation_drift: {
        Row: BalanceReconciliationRow;
        Relationships: never[];
      };
      [key: string]: GenericView;
    };
    Functions: Record<string, { Args: Record<string, any>; Returns: any }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, never>;
  };
}
