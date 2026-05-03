import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[Rentrix] Supabase credentials not found. " +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Replit secrets. " +
      "The app will show empty data until credentials are configured."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type Property = {
  id: string;
  name: string;
  address?: string;
  type?: string;
  created_at?: string;
};

export type Unit = {
  id: string;
  property_id: string;
  name: string;
  status: string;
  rent_default?: number;
  floor?: number;
  created_at?: string;
};

export type Tenant = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  nationality?: string;
  id_no?: string;
  status: string;
  created_at?: string;
};

export type Contract = {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  status: string;
  due_day?: number;
  deposit?: number;
  created_at?: string;
};

export type Invoice = {
  id: string;
  contract_id?: string;
  tenant_id?: string;
  type: string;
  amount: number;
  status: string;
  due_date?: string;
  paid_date?: string;
  created_at?: string;
};

export type Receipt = {
  id: string;
  invoice_id?: string;
  amount: number;
  paid_at?: string;
  created_at?: string;
};

export type Expense = {
  id: string;
  property_id?: string;
  type?: string;
  amount: number;
  date?: string;
  description?: string;
  created_at?: string;
};
