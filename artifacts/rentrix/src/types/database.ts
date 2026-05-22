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
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'ADMIN' | 'MANAGER' | 'USER' | 'TENANT';
          status: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_log']['Row']> & Pick<Database['public']['Tables']['audit_log']['Row'], 'action'>;
        Update: Partial<Database['public']['Tables']['audit_log']['Row']>;
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
          invoice_id: string;
          amount: number;
          payment_method: 'cash' | 'bank_transfer' | 'card' | 'check' | 'other';
          payment_date: string;
          reference_number: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['payments']['Row']> & Pick<Database['public']['Tables']['payments']['Row'], 'invoice_id' | 'amount' | 'payment_method' | 'payment_date'>;
        Update: Partial<Database['public']['Tables']['payments']['Row']>;
        Relationships: [];
      };

      maintenance_requests: {
        Row: {
          id: string;
          property_id: string;
          unit_id: string | null;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'open' | 'in_progress' | 'resolved' | 'closed';
          assigned_to: string | null;
          cost: number;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['maintenance_requests']['Row']> & Pick<Database['public']['Tables']['maintenance_requests']['Row'], 'property_id' | 'title' | 'priority' | 'status' | 'cost'>;
        Update: Partial<Database['public']['Tables']['maintenance_requests']['Row']>;
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
        Returns: string;
      };
      post_receipt_atomic: {
        Args: { payload: Json };
        Returns: string;
      };
      generate_invoices_from_active_contracts: { Args: Record<string, never>; Returns: number };
      rpt_financial_summary: { Args: { p_from: string; p_to: string }; Returns: { total_collected: number; total_overdue_invoices: number; total_expenses: number; net_revenue: number } };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
