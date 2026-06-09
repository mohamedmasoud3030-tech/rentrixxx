export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      company_settings: {
        Row: {
          id: string;
          singleton_key: boolean;
          company_name: string;
          legal_name: string | null;
          tax_number: string | null;
          registration_number: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          currency: string;
          locale: string;
          timezone: string;
          date_format: string;
          number_format: string;
          logo_url: string | null;
          invoice_prefix: string;
          receipt_prefix: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['company_settings']['Row']>;
        Update: Partial<Database['public']['Tables']['company_settings']['Row']>;
        Relationships: [];
      };
      owners: {
        Row: {
          id: string;
          full_name: string;
          display_name: string | null;
          phone: string | null;
          email: string | null;
          national_id: string | null;
          tax_number: string | null;
          address: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['owners']['Row']> & Pick<Database['public']['Tables']['owners']['Row'], 'full_name'>;
        Update: Partial<Database['public']['Tables']['owners']['Row']>;
        Relationships: [];
      };
      property_owners: {
        Row: {
          id: string;
          property_id: string;
          owner_id: string;
          ownership_percentage: number;
          is_primary: boolean;
          starts_on: string | null;
          ends_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['property_owners']['Row']> & Pick<Database['public']['Tables']['property_owners']['Row'], 'property_id' | 'owner_id'>;
        Update: Partial<Database['public']['Tables']['property_owners']['Row']>;
        Relationships: [
          {
            foreignKeyName: 'property_owners_property_id_fkey';
            columns: ['property_id'];
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_owners_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'owners';
            referencedColumns: ['id'];
          },
        ];
      };
      properties: {
        Row: {
          id: string;
          title: string;
          type: string;
          address: string;
          owner_name: string | null;
          purchase_value: number | null;
          current_value: number | null;
          status: 'active' | 'inactive' | 'maintenance' | 'sold';
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['properties']['Row']> & Pick<Database['public']['Tables']['properties']['Row'], 'title' | 'type' | 'address'>;
        Update: Partial<Database['public']['Tables']['properties']['Row']>;
        Relationships: [];
      };
      units: {
        Row: {
          id: string;
          property_id: string;
          unit_number: string;
          floor: string | null;
          status: 'available' | 'occupied' | 'maintenance' | 'reserved';
          rent_amount: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['units']['Row']> & Pick<Database['public']['Tables']['units']['Row'], 'property_id' | 'unit_number'>;
        Update: Partial<Database['public']['Tables']['units']['Row']>;
        Relationships: [];
      };
      people: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          email: string | null;
          national_id: string | null;
          type: 'tenant' | 'owner' | 'contact';
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['people']['Row']> & Pick<Database['public']['Tables']['people']['Row'], 'full_name' | 'type'>;
        Update: Partial<Database['public']['Tables']['people']['Row']>;
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          property_id: string;
          unit_id: string | null;
          tenant_id: string;
          start_date: string;
          end_date: string;
          rent_amount: number;
          payment_cycle: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
          status: 'draft' | 'active' | 'expired' | 'terminated';
          cancellation_reason: string | null;
          renewed_from_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['contracts']['Row']> & Pick<Database['public']['Tables']['contracts']['Row'], 'property_id' | 'tenant_id' | 'start_date' | 'end_date' | 'rent_amount'>;
        Update: Partial<Database['public']['Tables']['contracts']['Row']>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          contract_id: string;
          issue_date: string;
          due_date: string;
          amount: number;
          paid_amount: number;
          status: 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'void';
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['invoices']['Row']> & Pick<Database['public']['Tables']['invoices']['Row'], 'contract_id' | 'issue_date' | 'due_date' | 'amount'>;
        Update: Partial<Database['public']['Tables']['invoices']['Row']>;
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          invoice_id: string | null;
          amount: number | null;
          payment_method: string | null;
          payment_date: string | null;
          reference_number: string | null;
          reference_no: string | null;
          contract_id: string | null;
          date_time: string | null;
          channel: string | null;
          status: string | null;
          notes: string | null;
          receipt_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & Pick<Database['public']['Tables']['payments']['Row'], 'amount'>;
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
        Relationships: [];
      };

      receipts: {
        Row: {
          id: string;
          no: string | null;
          contract_id: string | null;
          date_time: string | null;
          channel: string | null;
          amount: number | null;
          ref: string | null;
          notes: string | null;
          status: string | null;
          check_number: string | null;
          check_bank: string | null;
          check_date: string | null;
          check_status: string | null;
          voided_at: number | null;
          request_id: string | null;
          tenant_id: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: number | null;
        };
        Insert: Partial<Database['public']['Tables']['receipts']['Row']> & Pick<Database['public']['Tables']['receipts']['Row'], 'amount'>;
        Update: Partial<Database['public']['Tables']['receipts']['Row']>;
        Relationships: [];
      };

      receipt_allocations: {
        Row: {
          id: string;
          receipt_id: string | null;
          invoice_id: string | null;
          amount: number | null;
          tenant_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['receipt_allocations']['Row']> & Pick<Database['public']['Tables']['receipt_allocations']['Row'], 'amount'>;
        Update: Partial<Database['public']['Tables']['receipt_allocations']['Row']>;
        Relationships: [];
      };

      maintenance_records: {
        Row: {
          id: string;
          no: string | null;
          property_id: string | null;
          unit_id: string | null;
          title: string | null;
          description: string | null;
          priority: string | null;
          status: string | null;
          assigned_to: string | null;
          cost: number | null;
          charged_to: string | null;
          notes: string | null;
          request_date: string | null;
          scheduled_date: string | null;
          work_description: string | null;
          technician_name: string | null;
          response_time_hours: number | null;
          expense_id: string | null;
          invoice_id: string | null;
          reported_by: string | null;
          completed_at: number | null;
          resolved_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['maintenance_records']['Row']> & Pick<Database['public']['Tables']['maintenance_records']['Row'], 'status'>;
        Update: Partial<Database['public']['Tables']['maintenance_records']['Row']>;
        Relationships: [];
      };

      expenses: {
        Row: {
          id: string;
          property_id: string;
          category: string;
          amount: number;
          expense_date: string;
          description: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['expenses']['Row']> & Pick<Database['public']['Tables']['expenses']['Row'], 'property_id' | 'category' | 'amount' | 'expense_date'>;
        Update: Partial<Database['public']['Tables']['expenses']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      renew_contract_atomic: {
        Args: { old_contract_id: string; new_contract_data: Json };
        Returns: { status: 'renewed'; old_contract_id: string; new_contract_id: string };
      };
      record_invoice_payment_atomic: {
        Args: { payload: Json };
        Returns: { status: 'recorded'; request_id: string; invoice_id: string; payment_id: string; receipt_id: string; receipt_no?: string; success?: boolean; idempotent?: boolean };
      };
      post_receipt_atomic: {
        Args: { payload: Json };
        Returns: Json;
      };
      generate_invoices_from_active_contracts: { Args: Record<string, never>; Returns: number };
      rpt_financial_summary: { Args: { p_from: string; p_to: string }; Returns: { collected: number; expenses: number; net: number; revenue: number; net_income: number; overdue_amount: number; overdue_count: number; active_contracts: number; total_units: number; occupied_units: number; occupancy_rate: number; pending_invoices: number; period_from: string; period_to: string } };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
